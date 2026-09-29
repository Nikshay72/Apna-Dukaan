# schema.py
# This file defines what a "shop" looks like as a Python object.
# Think of it as a blueprint — every shop in our system must match this structure.

from dataclasses import dataclass, field, asdict
from typing import List, Optional
import uuid
from datetime import datetime


@dataclass
class ShopData:
    """
    The complete data model for a shop.
    Every shop created through ApnaDukan will have these fields.
    """

    # Auto-generated unique ID for this shop
    id: str = field(default_factory=lambda: str(uuid.uuid4()))

    # Core shop identity
    shop_name: Optional[str] = None
    tagline: Optional[str] = None
    shop_type: Optional[str] = None  # food | clothing | services | general

    # Products or services offered
    products: List[str] = field(default_factory=list)

    # Business hours
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    open_days: Optional[str] = None

    # Contact & location
    location: Optional[str] = None
    phone: Optional[str] = None

    # Extra info the owner mentioned
    extra_info: Optional[str] = None

    # Website details (set after site is generated)
    site_url: Optional[str] = None
    site_html: Optional[str] = None

    # Timestamps
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        """Convert the ShopData object to a plain dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "ShopData":
        """Create a ShopData object from a plain dictionary (e.g., from Claude's JSON output)."""
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            shop_name=data.get("shop_name"),
            tagline=data.get("tagline"),
            shop_type=data.get("shop_type"),
            products=data.get("products") or [],
            opening_time=data.get("opening_time"),
            closing_time=data.get("closing_time"),
            open_days=data.get("open_days"),
            location=data.get("location"),
            phone=data.get("phone"),
            extra_info=data.get("extra_info"),
            site_url=data.get("site_url"),
            site_html=data.get("site_html"),
            created_at=data.get("created_at", datetime.utcnow().isoformat()),
            updated_at=data.get("updated_at", datetime.utcnow().isoformat()),
        )

    def is_complete(self) -> bool:
        """Returns True if all required fields are filled in."""
        required = [
            self.shop_name,
            self.products,
            self.opening_time,
            self.closing_time,
            self.open_days,
            self.location,
            self.phone
        ]
        for field_val in required:
            if field_val is None:
                return False
            if isinstance(field_val, list) and len(field_val) == 0:
                return False
            if isinstance(field_val, str) and field_val.strip() == "":
                return False
        return True

    def completion_percentage(self) -> int:
        """Returns how complete the shop profile is, as a percentage (0-100)."""
        required = {
            "shop_name": self.shop_name,
            "products": self.products,
            "opening_time": self.opening_time,
            "closing_time": self.closing_time,
            "open_days": self.open_days,
            "location": self.location,
            "phone": self.phone
        }
        filled = 0
        for val in required.values():
            if val and (not isinstance(val, list) or len(val) > 0):
                filled += 1
        return int((filled / len(required)) * 100)


def empty_shop() -> dict:
    """Returns a blank shop data dictionary with all fields set to None."""
    return ShopData().to_dict()
