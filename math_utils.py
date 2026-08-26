def divide_numbers(a: float, b: float) -> float:
    """
    Divides parameter a by parameter b.
    Returns 0.0 if b is zero to prevent ZeroDivisionError.
    """
    if b == 0:
        return 0.0
    return a / b