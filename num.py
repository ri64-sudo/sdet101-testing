from typing import List


def parse_integers_from_input(line: str) -> List[int]:
    tokens = line.strip().split()
    if not tokens:
        raise ValueError("No numbers provided. Enter integers separated by spaces, e.g., 1 4 9 16.")
    try:
        return [int(token) for token in tokens]
    except ValueError as exc:
        raise ValueError(
            "Invalid input. Please enter only integers separated by spaces, e.g., 1 4 9 16."
        ) from exc


def main() -> None:
    try:
        line = input("Enter integers separated by spaces: ")
        numbers = parse_integers_from_input(line)
    except ValueError as error:
        print(error)
        return

    total = sum(numbers)
    count = len(numbers)
    mean = total / count
    minimum = min(numbers)
    maximum = max(numbers)
    sorted_numbers = sorted(numbers)

    print(f"Sum: {total}")
    print(f"Mean: {mean}")
    print(f"Min: {minimum}")
    print(f"Max: {maximum}")
    print(f"Sorted: {sorted_numbers}")


if __name__ == "__main__":
    main()


