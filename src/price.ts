export function addVAT(price: number): number {
    return price * 1.25;
}

export function removeVAT(price: number): number {
    return price * 0.8;
}