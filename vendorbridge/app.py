"""
VendorBridge — Flask Backend Starter
=====================================
Handles authentication, session management, and role-based access control.
Run:  python app.py
"""

from flask import (
    Flask, render_template, request, redirect,
    url_for, session, flash
)
import sqlite3, os, hashlib, secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)   # replace with a fixed key in production

DB_PATH = os.path.join(os.path.dirname(__file__), "vendorbridge.db")

# ─────────────────────────────────────────────
# DATABASE SETUP
# ─────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _get_columns(db, table: str) -> set:
    """Return the set of column names that currently exist in a table."""
    rows = db.execute(f"PRAGMA table_info({table})").fetchall()
    return {row["name"] for row in rows}


def init_db():
    """
    Create tables on first run, then run safe ALTER TABLE migrations
    so that columns added after the initial DB creation are never missing.
    """
    with get_db() as db:
        # ── Create tables (idempotent) ───────────────────────────────────
        db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT    NOT NULL UNIQUE,
                password TEXT    NOT NULL,
                role     TEXT    NOT NULL CHECK(role IN ('company','vendor'))
            );

            CREATE TABLE IF NOT EXISTS requests (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                item_name TEXT    NOT NULL,
                deadline  TEXT    NOT NULL,
                status    TEXT    NOT NULL DEFAULT 'Open'
            );

            CREATE TABLE IF NOT EXISTS bids (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id    INTEGER NOT NULL,
                vendor_name   TEXT    NOT NULL,
                price         REAL    NOT NULL,
                delivery_days INTEGER NOT NULL,
                FOREIGN KEY (request_id) REFERENCES requests(id)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id  INTEGER NOT NULL,
                sender      TEXT    NOT NULL,
                sender_role TEXT    NOT NULL,
                message     TEXT    NOT NULL,
                sent_at     TEXT    DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (request_id) REFERENCES requests(id)
            );
        """)

        # ── Migrations: add columns that may be missing in older DBs ────
        bids_cols = _get_columns(db, "bids")

        if "notes" not in bids_cols:
            db.execute("ALTER TABLE bids ADD COLUMN notes TEXT DEFAULT ''")
            print("[migration] bids.notes column added.")

        if "submitted_at" not in bids_cols:
            db.execute(
                "ALTER TABLE bids ADD COLUMN submitted_at TEXT "
                "DEFAULT (datetime('now','localtime'))"
            )
            print("[migration] bids.submitted_at column added.")

        if "is_approved" not in bids_cols:
            db.execute("ALTER TABLE bids ADD COLUMN is_approved INTEGER DEFAULT 0")
            print("[migration] bids.is_approved column added.")

        db.commit()




def _hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def login_required(role: str = None):
    """Decorator: ensure user is logged in (optionally as a specific role)."""
    import functools
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            if not session.get("role"):
                flash("Please log in to continue.", "warning")
                return redirect(url_for("login"))
            if role and session.get("role") != role:
                flash(f"Access denied: this page is for {role} accounts only.", "error")
                return redirect(url_for("login"))
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# ─────────────────────────────────────────────
# ROUTES — AUTH
# ─────────────────────────────────────────────

@app.route("/", methods=["GET"])
def login():
    """Login page — role selected via tabs."""
    if session.get("role") == "company":
        return redirect(url_for("company_dashboard"))
    if session.get("role") == "vendor":
        return redirect(url_for("vendor_portal"))
    return render_template("login.html")


@app.route("/login/company", methods=["POST"])
def login_company():
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")

    if not username or not password:
        flash("Username and password are required.", "error")
        return redirect(url_for("login") + "?role=company")

    with get_db() as db:
        user = db.execute(
            "SELECT * FROM users WHERE username=? AND role='company'", (username,)
        ).fetchone()

    if not user or user["password"] != _hash(password):
        flash("Invalid company credentials. Please try again.", "error")
        return redirect(url_for("login") + "?role=company")

    session.clear()
    session["user_id"]  = user["id"]
    session["username"] = user["username"]
    session["role"]     = "company"
    flash(f"Welcome back, {username}!", "success")
    return redirect(url_for("company_dashboard"))


@app.route("/login/vendor", methods=["POST"])
def login_vendor():
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")

    if not username or not password:
        flash("Username and password are required.", "error")
        return redirect(url_for("login") + "?role=vendor")

    with get_db() as db:
        user = db.execute(
            "SELECT * FROM users WHERE username=? AND role='vendor'", (username,)
        ).fetchone()

    if not user or user["password"] != _hash(password):
        flash("Invalid vendor credentials. Please try again.", "error")
        return redirect(url_for("login") + "?role=vendor")

    session.clear()
    session["user_id"]  = user["id"]
    session["username"] = user["username"]
    session["role"]     = "vendor"
    flash(f"Welcome back, {username}!", "success")
    return redirect(url_for("vendor_portal"))


@app.route("/logout", methods=["POST"])
def logout():
    role = session.get("role", "")
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("login") + (f"?role={role}" if role else ""))


# ─────────────────────────────────────────────
# ROUTES — REGISTER
# ─────────────────────────────────────────────

def _register(role: str):
    """Shared registration logic for both roles."""
    username         = request.form.get("username", "").strip()
    password         = request.form.get("password", "")
    confirm_password = request.form.get("confirm_password", "")
    redirect_url     = url_for("login") + f"?role={role}&mode=register"

    # ── Validation ──────────────────────────────────────────
    if not username or len(username) < 3:
        flash("Username must be at least 3 characters.", "error")
        return redirect(redirect_url)

    if not password or len(password) < 6:
        flash("Password must be at least 6 characters.", "error")
        return redirect(redirect_url)

    if password != confirm_password:
        flash("Passwords do not match. Please try again.", "error")
        return redirect(redirect_url)

    # ── Insert user ─────────────────────────────────────────
    try:
        with get_db() as db:
            db.execute(
                "INSERT INTO users (username, password, role) VALUES (?,?,?)",
                (username, _hash(password), role)
            )
            db.commit()
    except sqlite3.IntegrityError:
        flash(f'Username "{username}" is already taken. Please choose another.', "error")
        return redirect(redirect_url)

    # ── Auto-login after successful registration ────────────
    with get_db() as db:
        user = db.execute(
            "SELECT * FROM users WHERE username=? AND role=?", (username, role)
        ).fetchone()

    session.clear()
    session["user_id"]  = user["id"]
    session["username"] = user["username"]
    session["role"]     = role

    flash(f'Account created! Welcome to VendorBridge, {username}.', "success")
    return redirect(url_for("company_dashboard") if role == "company" else url_for("vendor_portal"))


@app.route("/register/company", methods=["POST"])
def register_company():
    """Register a new Company account."""
    return _register("company")


@app.route("/register/vendor", methods=["POST"])
def register_vendor():
    """Register a new Vendor account."""
    return _register("vendor")


# ─────────────────────────────────────────────
# ROUTES — COMPANY (role=company only)
# ─────────────────────────────────────────────

@app.route("/company")
@login_required(role="company")
def company_dashboard():
    with get_db() as db:
        requests = db.execute("SELECT * FROM requests ORDER BY id DESC").fetchall()
    return render_template("company_dash.html", requests=requests)


@app.route("/submit_request", methods=["POST"])
@login_required(role="company")
def submit_request():
    item_name = request.form.get("item_name", "").strip()
    deadline  = request.form.get("deadline", "").strip()

    if not item_name or len(item_name) < 5:
        flash("Item name must be at least 5 characters.", "error")
        return redirect(url_for("company_dashboard"))
    if not deadline:
        flash("A bid deadline is required.", "error")
        return redirect(url_for("company_dashboard"))

    with get_db() as db:
        db.execute(
            "INSERT INTO requests (item_name, deadline, status) VALUES (?,?,?)",
            (item_name, deadline, "Open")
        )
        db.commit()

    flash(f'Request "{item_name}" has been broadcast to all vendors.', "success")
    return redirect(url_for("company_dashboard"))


@app.route("/approve_bid", methods=["POST"])
@login_required(role="company")
def approve_bid():
    bid_id = request.form.get("bid_id")
    req_id = request.form.get("req_id")
    if not bid_id:
        flash("No bid selected.", "error")
        return redirect(url_for("approval"))

    with get_db() as db:
        bid = db.execute("SELECT * FROM bids WHERE id=?", (bid_id,)).fetchone()
        if not bid:
            flash("Bid not found.", "error")
            return redirect(url_for("approval"))

        # Mark request as Completed and winning bid as approved
        db.execute(
            "UPDATE requests SET status='Completed' WHERE id=?",
            (bid["request_id"],)
        )
        db.execute(
            "UPDATE bids SET is_approved=1 WHERE id=?",
            (bid_id,)
        )
        # Auto-post a system message to the chat
        db.execute(
            """INSERT INTO messages (request_id, sender, sender_role, message)
               VALUES (?, ?, ?, ?)""",
            (
                bid["request_id"],
                session.get("username"),
                "company",
                f"\U0001f91d Deal completed! Contract has been awarded to "
                f"{bid['vendor_name']} for ${bid['price']:,.2f} "
                f"with {bid['delivery_days']}-day delivery."
            )
        )
        db.commit()
        rfq_id = bid["request_id"]

    flash(
        f"\U0001f389 Contract awarded to {bid['vendor_name']}! Deal is now marked as Completed.",
        "success"
    )
    return redirect(url_for("approval") + f"?req_id={rfq_id}")


# ─────────────────────────────────────────────
# ROUTES — VENDOR (role=vendor only)
# ─────────────────────────────────────────────

@app.route("/vendor")
@login_required(role="vendor")
def vendor_portal():
    vendor_name = session.get("username")
    with get_db() as db:
        # Show Open requests + any request this vendor has bid on
        all_reqs = db.execute(
            "SELECT * FROM requests ORDER BY deadline ASC"
        ).fetchall()
        my_bids = db.execute(
            "SELECT request_id, is_approved FROM bids WHERE vendor_name=?",
            (vendor_name,)
        ).fetchall()
    my_bid_map = {b["request_id"]: b["is_approved"] for b in my_bids}
    # Only show Open requests + requests this vendor bid on
    visible = [
        r for r in all_reqs
        if r["status"] == "Open" or r["id"] in my_bid_map
    ]
    return render_template(
        "vendor_portal.html",
        requests=visible,
        my_bid_map=my_bid_map
    )


@app.route("/submit_bid", methods=["POST"])
@login_required(role="vendor")
def submit_bid():
    """Submit a vendor bid for an open RFQ."""
    request_id    = request.form.get("request_id", "").strip()
    price_raw     = request.form.get("price", "").strip()
    delivery_raw  = request.form.get("delivery_days", "").strip()
    notes         = request.form.get("notes", "").strip()
    vendor_name   = session.get("username")

    # ── Validate request ID ─────────────────────────────────
    if not request_id:
        flash("Invalid request. Please try again.", "error")
        return redirect(url_for("vendor_portal"))

    # ── Validate price ───────────────────────────────────────
    try:
        price = float(price_raw)
        if price <= 0:
            raise ValueError
    except (ValueError, TypeError):
        flash("Please enter a valid bid price greater than $0.", "error")
        return redirect(url_for("vendor_portal"))

    # ── Validate delivery days ───────────────────────────────
    try:
        delivery_days = int(delivery_raw)
        if delivery_days < 1 or delivery_days > 365:
            raise ValueError
    except (ValueError, TypeError):
        flash("Delivery time must be between 1 and 365 days.", "error")
        return redirect(url_for("vendor_portal"))

    with get_db() as db:
        # ── Check the RFQ is still open ──────────────────────
        rfq = db.execute(
            "SELECT * FROM requests WHERE id=? AND status='Open'", (request_id,)
        ).fetchone()
        if not rfq:
            flash("This request is no longer open for bids.", "warning")
            return redirect(url_for("vendor_portal"))

        # ── Prevent duplicate bid from same vendor ───────────
        existing = db.execute(
            "SELECT id FROM bids WHERE request_id=? AND vendor_name=?",
            (request_id, vendor_name)
        ).fetchone()
        if existing:
            flash(
                f'You have already submitted a bid for "{rfq["item_name"]}". '
                "Only one bid per vendor is allowed.", "warning"
            )
            return redirect(url_for("vendor_portal"))

        # ── Insert the bid ───────────────────────────────────
        db.execute(
            """INSERT INTO bids (request_id, vendor_name, price, delivery_days, notes)
               VALUES (?, ?, ?, ?, ?)""",
            (request_id, vendor_name, price, delivery_days, notes)
        )
        db.commit()

    flash(
        f'Your bid of ${price:,.2f} with {delivery_days}-day delivery for '
        f'"{rfq["item_name"]}" has been submitted successfully!',
        "success"
    )
    return redirect(url_for("vendor_portal"))


# ─────────────────────────────────────────────
# ROUTES — SHARED (any logged-in role)
# ─────────────────────────────────────────────

@app.route("/approval")
@login_required()
def approval():
    req_id = request.args.get("req_id")
    with get_db() as db:
        if req_id:
            rfq = db.execute(
                "SELECT * FROM requests WHERE id=?", (req_id,)
            ).fetchone()
            bids = db.execute(
                "SELECT * FROM bids WHERE request_id=? ORDER BY price ASC",
                (req_id,)
            ).fetchall()
            messages = db.execute(
                "SELECT * FROM messages WHERE request_id=? ORDER BY sent_at ASC",
                (req_id,)
            ).fetchall()
        else:
            rfq      = None
            bids     = db.execute("SELECT * FROM bids ORDER BY price ASC").fetchall()
            messages = []
    return render_template("approval.html", bids=bids, rfq=rfq, messages=messages)


@app.route("/send_message", methods=["POST"])
@login_required()
def send_message():
    req_id  = request.form.get("request_id", "").strip()
    message = request.form.get("message",    "").strip()

    if not req_id or not message:
        flash("Message cannot be empty.", "error")
        return redirect(url_for("approval") + f"?req_id={req_id}#chat")

    if len(message) > 1000:
        flash("Message too long (max 1000 characters).", "error")
        return redirect(url_for("approval") + f"?req_id={req_id}#chat")

    with get_db() as db:
        # Verify request exists
        rfq = db.execute("SELECT id FROM requests WHERE id=?", (req_id,)).fetchone()
        if not rfq:
            flash("Request not found.", "error")
            return redirect(url_for("approval"))

        db.execute(
            """INSERT INTO messages (request_id, sender, sender_role, message)
               VALUES (?, ?, ?, ?)""",
            (req_id, session.get("username"), session.get("role"), message)
        )
        db.commit()

    return redirect(url_for("approval") + f"?req_id={req_id}#chat")


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    print("\n  VendorBridge running at http://127.0.0.1:5000")
    print("  Demo accounts (password: password123):")
    print("    Company → acme_corp  / globex_co")
    print("    Vendor  → rapid_supply / metalworks_ltd\n")
    app.run(debug=True)
