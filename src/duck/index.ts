import * as fs from "fs";
import * as util from "util";
import {Lexer} from "./lexer";
import {Parser} from "./parser";
import {Reporter} from "./error";
import { ASTPrinter } from "./astprinter";
import { Resolver } from "./resolver";

const readFileAsync = util.promisify(fs.readFile);

export namespace Duck {
    export async function runFile(filename : string){
        try {
            const contents = await readFile(filename);
            run(contents);
        } catch(e){
            console.error(e);
            process.exit(1);
        }
    }

    async function readFile(filename : string) : Promise<string>{
        try {
            return (await readFileAsync(filename)).toString();
        } catch(e) {
            throw `Error: File '${filename}' not found`;
        }
    }

    function run(source : string){
        const lexer = new Lexer(source);

        let tokens = lexer.scan();

        if (Reporter.hasError) process.exit(1);

        const parser = new Parser(tokens);
        let statements = parser.parse();

        if (Reporter.hasError) process.exit(1);        

        let resolver = new Resolver();
        resolver.resolve(statements);
        
        if (Reporter.hasError) process.exit(1);

        let printer = new ASTPrinter();
        console.log(printer.print(statements));
    }
}