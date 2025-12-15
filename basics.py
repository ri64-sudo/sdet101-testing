"""Basic arithmetic and utility functions.

Functions:
- add(a, b): Return the sum of two numbers.
- is_even(n): Return True if n is an even integer, False otherwise.
- safe_divide(a, b): Return a / b, or None if b is zero.
"""

from typing import Optional, Union

Number = Union[int, float]


def add(a: Number, b: Number) -> Number:
    """Return the sum of a and b."""
    return a + b


def is_even(n: int) -> bool:
    """Return True if n is even, otherwise False."""
    return n % 2 == 0


def safe_divide(a: Number, b: Number) -> Optional[Number]:
    """Return a divided by b, or None if division by zero would occur."""
    if b == 0:
        return None
    return a / b

x = add(1,2)
print(x)