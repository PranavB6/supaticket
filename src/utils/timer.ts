
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PrecisionTimer {
    private startTime: bigint;

    constructor() {
        this.startTime = process.hrtime.bigint();
    }

    /**
     * Resets the timer to the current time
     */
    public start(): void {
        this.startTime = process.hrtime.bigint();
    }

    /**
     * Returns the elapsed time in milliseconds
     */
    public elapsed(): number {
        const endTime = process.hrtime.bigint();
        const diffNs = endTime - this.startTime;
        return Number(diffNs) / 1e6;
    }
}