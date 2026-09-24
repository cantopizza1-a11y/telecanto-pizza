import os, logging, smtplib, ssl
from email.message import EmailMessage
from html import escape

log = logging.getLogger("telecanto.mail")

STORE = {"name": "Telecanto Pizza & Pasta", "address": "Αναλήψεως 174, Βόλος", "phone": "24210 55085"}


def _fmt(v: float) -> str:
    return f"{v:.2f}".replace(".", ",") + "€"


def _items_html(order: dict) -> str:
    rows = []
    for it in order.get("items", []):
        extra = " · ".join(filter(None, [it.get("size"), *(it.get("choices") or []), *(e["name"] for e in (it.get("extras") or []))]))
        rows.append(f"<tr><td style='padding:6px 0'>{it['quantity']}× {escape(it['name'])}"
                    + (f"<div style='color:#64748b;font-size:12px'>{escape(extra)}</div>" if extra else "")
                    + f"</td><td style='text-align:right;padding:6px 0'>{_fmt(it['line_total'])}</td></tr>")
    return "".join(rows)


def _totals_html(order: dict) -> str:
    pickup = order.get("mode") == "pickup"
    rows = [f"<tr><td style='padding:4px 0;color:#475569'>Υποσύνολο προϊόντων</td><td style='text-align:right;padding:4px 0'>{_fmt(order.get('subtotal', 0))}</td></tr>"]
    if order.get("discount", 0) > 0:
        rows.append(f"<tr><td style='padding:4px 0;color:#047857'>Έκπτωση</td><td style='text-align:right;padding:4px 0;color:#047857'>-{_fmt(order['discount'])}</td></tr>")
    if not pickup:
        rows.append(f"<tr><td style='padding:4px 0;color:#475569'>Κόστος delivery</td><td style='text-align:right;padding:4px 0'>+{_fmt(order.get('delivery_fee', 0))}</td></tr>")
    else:
        rows.append("<tr><td style='padding:4px 0;color:#475569'>Παραλαβή από το κατάστημα</td><td style='text-align:right;padding:4px 0'>0,00€</td></tr>")
    rows.append(f"<tr><td style='padding:10px 0 0;font-size:18px'><b>Σύνολο</b></td><td style='text-align:right;padding:10px 0 0;font-size:18px;color:#e0187a'><b>{_fmt(order.get('total', 0))}</b></td></tr>")
    return f"<table style='width:100%;font-size:14px;margin-top:8px'>{''.join(rows)}</table>"


def _totals_text(order: dict) -> str:
    pickup = order.get("mode") == "pickup"
    lines = [f"Υποσύνολο προϊόντων: {_fmt(order.get('subtotal', 0))}"]
    if order.get("discount", 0) > 0: lines.append(f"Έκπτωση: -{_fmt(order['discount'])}")
    lines.append("Παραλαβή από το κατάστημα: 0,00€" if pickup else f"Κόστος delivery: +{_fmt(order.get('delivery_fee', 0))}")
    lines.append(f"ΣΥΝΟΛΟ: {_fmt(order.get('total', 0))}")
    return "\n".join(lines)


def build_store_email(order: dict) -> tuple[str, str, str]:
    short = order["id"][:8].upper()
    pickup = order.get("mode") == "pickup"
    subject = f"🍕 ΝΕΑ ΠΑΡΑΓΓΕΛΙΑ #{short} — {'ΠΑΡΑΛΑΒΗ' if pickup else 'DELIVERY'} — {_fmt(order.get('total', 0))}"
    addr = "" if pickup else f"<p><b>Διεύθυνση:</b> {escape(order.get('address') or '')} {escape(order.get('address_number') or '')}{', όρ. ' + escape(order['floor']) if order.get('floor') else ''} · {escape(order.get('area') or '')}</p>"
    sched = order.get("scheduled_for")
    sched_html = f"<p style='color:#b45309'><b>ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΗ:</b> {escape(str(sched)[:16].replace('T', ' '))}</p>" if sched else ""
    notes = f"<p><b>Σημειώσεις:</b> {escape(order['notes'])}</p>" if order.get("notes") else ""
    pay = {"cash": "Μετρητά", "card_pos": "Κάρτα στο κατάστημα", "iris": "IRIS"}.get(order.get("payment_method"), order.get("payment_method"))
    html = f"""<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
<div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;padding:28px;border:2px solid #e0187a">
  <h1 style="color:#e0187a;margin:0;font-size:22px">Νέα παραγγελία #{short}</h1>
  <p style="font-size:18px;margin:8px 0"><b>{"ΠΑΡΑΛΑΒΗ ΑΠΟ ΤΟ ΚΑΤΑΣΤΗΜΑ" if pickup else "DELIVERY"}</b> · {pay}</p>{sched_html}
  <p><b>Πελάτης:</b> {escape(order.get('customer_name') or '')} · <a href="tel:{escape(order.get('customer_phone') or '')}">{escape(order.get('customer_phone') or '')}</a><br>{escape(order.get('customer_email') or '')}</p>{addr}{notes}
  <table style="width:100%;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:14px">{_items_html(order)}</table>
  {_totals_html(order)}
  <p style="margin-top:20px"><a href="{os.environ.get('PUBLIC_URL', '')}/admin/orders" style="background:#e0187a;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Άνοιγμα Admin → Αποδοχή</a></p>
  <p style="color:#94a3b8;font-size:12px">Η παραγγελία περιμένει αποδοχή στο admin panel.</p>
</div></body></html>"""
    text = f"ΝΕΑ ΠΑΡΑΓΓΕΛΙΑ #{short} — {'ΠΑΡΑΛΑΒΗ' if pickup else 'DELIVERY'} · {pay}\nΠελάτης: {order.get('customer_name')} {order.get('customer_phone')}\n{_totals_text(order)}"
    return subject, html, text


def build_email(order: dict, event: str, eta_minutes: int | None = None) -> tuple[str, str, str]:
    short = order["id"][:8].upper()
    pickup = order.get("mode") == "pickup"
    name = escape(order.get("customer_name") or "")
    if event == "confirmed":
        subject = f"Η παραγγελία σας #{short} έγινε αποδεκτή — Telecanto"
        if pickup:
            headline, body = "Η παραγγελία σας έγινε αποδεκτή!", f"Θα είναι έτοιμη για παραλαβή σε περίπου <b>{eta_minutes} λεπτά</b> από το κατάστημά μας ({STORE['address']})."
        else:
            headline, body = "Η παραγγελία σας έγινε αποδεκτή!", f"Εκτιμώμενος χρόνος παράδοσης: περίπου <b>{eta_minutes} λεπτά</b>."
    elif event == "ready":
        subject = f"Η παραγγελία σας #{short} είναι έτοιμη — Telecanto"
        headline = "Η παραγγελία σας είναι έτοιμη!"
        body = f"Μπορείτε να την παραλάβετε από το κατάστημά μας, {STORE['address']}." if pickup else "Ο διανομέας ξεκινά σε λίγο."
    elif event == "delivering":
        subject = f"Η παραγγελία σας #{short} είναι καθ' οδόν — Telecanto"
        headline, body = "Η παραγγελία σας είναι καθ' οδόν!", "Ο διανομέας μας έρχεται στη διεύθυνσή σας."
    else:
        subject = f"Ενημέρωση παραγγελίας #{short} — Telecanto"
        headline, body = "Ενημέρωση παραγγελίας", f"Νέα κατάσταση: {escape(event)}"
    sched = order.get("scheduled_for")
    sched_html = f"<p style='color:#b45309'><b>Προγραμματισμένη για:</b> {escape(str(sched)[:16].replace('T', ' '))}</p>" if sched else ""
    html = f"""<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
<div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e2e8f0">
  <h1 style="color:#e0187a;margin:0 0 4px;font-size:22px">{STORE['name']}</h1>
  <h2 style="margin:16px 0 8px;font-size:20px">{headline}</h2>
  <p style="color:#334155">Γεια σας {name}, {body}</p>{sched_html}
  <p style="color:#64748b;font-size:13px">Παραγγελία <b>#{short}</b> · {"Παραλαβή από το κατάστημα" if pickup else "Delivery"} · Πληρωμή: {{"cash": "Μετρητά", "card_pos": "Κάρτα στο κατάστημα", "iris": "IRIS"}}.get(order.get("payment_method"), order.get("payment_method"))</p>
  <table style="width:100%;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:14px">{_items_html(order)}</table>
  {_totals_html(order)}
  <p style="color:#94a3b8;font-size:12px;margin-top:24px">{STORE['address']} · Τηλ. {STORE['phone']}<br>Ευχαριστούμε για την προτίμησή σας!</p>
</div></body></html>"""
    text = f"{headline}\n\n{body.replace('<b>', '').replace('</b>', '')}\nΠαραγγελία #{short}\n{_totals_text(order)}\n{STORE['name']} · {STORE['address']} · {STORE['phone']}"
    return subject, html, text


def send_email(to: str, subject: str, html: str, text: str) -> None:
    msg = EmailMessage()
    msg["From"] = os.environ["MAIL_FROM"]; msg["To"] = to; msg["Subject"] = subject
    msg.set_content(text); msg.add_alternative(html, subtype="html")
    with smtplib.SMTP_SSL(os.environ["SMTP_HOST"], int(os.environ["SMTP_PORT"]), timeout=20, context=ssl.create_default_context()) as s:
        s.login(os.environ["SMTP_USERNAME"], os.environ["SMTP_APP_PASSWORD"])
        s.send_message(msg)
