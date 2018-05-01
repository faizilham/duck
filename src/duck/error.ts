export class ErrHandler {
    public hasError = false;
    private static reporter = new ErrHandler();

    public static getReporter() : ErrHandler {
        return ErrHandler.reporter;
    }

    private constructor(){
        this.reset();
    }

    public reset(){
        this.hasError = false;
    }

    public report(line: number, message: string){
        this.hasError = true;
        console.error(`Error: ${message} [line ${line}]`);
    }
}

export const Reporter : ErrHandler = ErrHandler.getReporter();