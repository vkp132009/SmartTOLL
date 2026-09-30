from decimal import Decimal, DecimalException, InvalidOperation, ROUND_HALF_UP, localcontext


CENT = Decimal("0.01")
TWENTY_TONS = Decimal("20")
MAX_WEIGHT_TONS = Decimal("1000000")
MAX_VEHICLES_PER_RUN = 100000
VEHICLE_TYPES = {
    "EMERGENCY": "EMERGENCY VEHICLE",
    "EMERGENCY VEHICLE": "EMERGENCY VEHICLE",
    "TRUCK": "TRUCK",
    "CAR": "CAR",
}


def normalize_vehicle_type(value):
    if not isinstance(value, str):
        raise ValueError("Vehicle type must be text.")

    normalized = VEHICLE_TYPES.get(value.strip().upper())
    if normalized is None:
        raise ValueError("Choose EMERGENCY, TRUCK, or CAR.")
    return normalized


def validate_weight(weight_tons):
    try:
        weight = Decimal(str(weight_tons).strip())
    except (InvalidOperation, TypeError, ValueError) as error:
        raise ValueError("Weight must be a valid number of tons.") from error

    if not weight.is_finite() or weight <= 0 or weight > MAX_WEIGHT_TONS:
        raise ValueError("Weight must be greater than zero and no more than 1,000,000 tons.")
    return weight


def calculate_toll(vehicle_type, weight_tons, has_fastag):
    vehicle = normalize_vehicle_type(vehicle_type)
    weight = validate_weight(weight_tons)
    if not isinstance(has_fastag, bool):
        raise ValueError("FASTag status must be True or False.")

    if vehicle == "EMERGENCY VEHICLE":
        base_toll = Decimal("0")
    elif vehicle == "TRUCK":
        if weight > TWENTY_TONS:
            base_toll = Decimal("500") + Decimal("150") * (weight - TWENTY_TONS)
        else:
            base_toll = Decimal("400")
    else:
        base_toll = Decimal("100")

    adjustment = Decimal("0.90") if has_fastag else Decimal("1.50")
    try:
        with localcontext() as context:
            context.prec = max(context.prec, len(weight.as_tuple().digits) + 10)
            return (base_toll * adjustment).quantize(CENT, rounding=ROUND_HALF_UP)
    except DecimalException as error:
        raise ValueError("Weight is outside the supported calculation range.") from error


def read_vehicle_count():
    while True:
        try:
            count = int(input("Enter number of vehicles: ").strip())
        except ValueError:
            print("Enter a whole number that is zero or greater.")
            continue

        if count < 0:
            print("Vehicle count cannot be negative.")
            continue
        if count > MAX_VEHICLES_PER_RUN:
            print(f"A single run cannot exceed {MAX_VEHICLES_PER_RUN} vehicles.")
            continue
        return count


def read_vehicle_type():
    while True:
        try:
            return normalize_vehicle_type(
                input("Enter vehicle type (EMERGENCY, TRUCK, CAR): ")
            )
        except ValueError as error:
            print(error)


def read_weight():
    while True:
        try:
            return validate_weight(input("Enter vehicle weight in tons: "))
        except ValueError as error:
            print(error)


def read_fastag_status():
    while True:
        answer = input("Does the vehicle have FASTag? (True/False): ").strip().casefold()
        if answer == "true":
            return True
        if answer == "false":
            return False
        print("Enter True or False.")


def main():
    vehicle_count = read_vehicle_count()
    total_revenue = Decimal("0.00")

    for vehicle_number in range(1, vehicle_count + 1):
        print(f"\nVehicle {vehicle_number} of {vehicle_count}")
        vehicle_type = read_vehicle_type()
        weight_tons = read_weight()
        has_fastag = read_fastag_status()
        toll = calculate_toll(vehicle_type, weight_tons, has_fastag)

        if vehicle_type == "EMERGENCY VEHICLE":
            print("TOLL EXEMPT")
        elif not has_fastag:
            print("MANUAL LANE PENALTY APPLIED")

        print(f"Final toll payable: ${toll:.2f}")
        total_revenue += toll

    print(f"Total revenue collected: ${total_revenue:.2f}")


if __name__ == "__main__":
    main()