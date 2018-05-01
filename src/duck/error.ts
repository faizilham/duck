export class ErrHandler {
    public hasError : boolean;
    private static reporter = null;

    public static getReporter() : ErrHandler {
        if (!ErrHandler.reporter){
            ErrHandler.reporter = new ErrHandler();
        }

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