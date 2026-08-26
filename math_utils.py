def divide_numbers(a: float, b: float) -> float:
    """
    Divides parameter a by parameter b.
    Returns 0.0 if denominator is zero to preserve backward compatibility.
    """
    if b == 0:
        return 0.0
    return a / b