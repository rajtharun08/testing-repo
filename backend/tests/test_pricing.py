import pytest
from services.pricing_engine import calculate_cart_summary

def test_standard_cart_calculation():
    items = [{"id": "p1", "price": 50.0, "quantity": 2}]
    result = calculate_cart_summary(items, promo_code="SAVE10")
    
    assert result["subtotal"] == 100.0
    assert result["discount_percent"] == 10.0
    assert result["discount_amount"] == 10.0
    assert result["total"] > 0.0

def test_no_promo_code():
    items = [{"id": "p2", "price": 25.0, "quantity": 1}]
    result = calculate_cart_summary(items, promo_code="")
    
    assert result["subtotal"] == 25.0
    assert result["discount_percent"] == 0.0
    assert result["discount_amount"] == 0.0

def test_invalid_promo_code():
    items = [{"id": "p3", "price": 40.0, "quantity": 1}]
    result = calculate_cart_summary(items, promo_code="SAVE100")

    assert result["discount_percent"] == 0.0
    assert result["discount_amount"] == 0.0
    assert result["total"] > 0.0

def test_full_discount_promo_code_does_not_divide_by_zero():
    items = [{"id": "p4", "price": 40.0, "quantity": 1}]
    result = calculate_cart_summary(items, promo_code="FREESHIP100")

    assert result["discount_percent"] == 100.0
    assert result["discount_amount"] == 40.0
    assert result["tax_amount"] == 0.0
    assert result["total"] == 9.99
