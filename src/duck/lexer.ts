/**
 * Lexer make array of token from source code string
 */

import {Token, TokenType} from "./token"
import {DuckType} from "./types"
import {Reporter} from "./error"

const ReservedWords : any = {
    "true": TokenType.TRUE,
    "false": TokenType.FALSE,

    "if": TokenType.IF,
    "else": TokenType.ELSE,
    "while": TokenType.WHILE,

    "and": TokenType.AND,
    "or": TokenType.OR,

    "number": TokenType.TYPE_NUMBER,
    "string": TokenType.TYPE_STRING,
    "bool": TokenType.TYPE_BOOL,

    "let": TokenType.LET,
    "print": TokenType.PRINT, // temporarily
};

export class Lexer {
    private current : number = 0;
    private start : number = 0;
    private line : number = 0;
    private source : string;
    private tokens : Array<Token> = [];

    constructor(source : string){
        this.source = source;
    }

    public scan() : Array<Token> {
        this.current = 0;
        this.line = 1;
        this.tokens = [];

        while(!this.atEnd()){
            this.start = this.current;
            this.scanToken();
        }

        this.tokens.push(new Token(TokenType.EOF, "", this.line));
        
        return this.tokens;        
    }
    

    private scanToken(){
        const c = this.advance();

        switch(c){
            // delimiter
            case ';': this.addToken(TokenType.SEMICOLON); break;
            case ',': this.addToken(TokenType.COMMA); break;
            case '.': this.addToken(TokenType.DOT); break;
            case ':': this.addToken(TokenType.COLON); break;

            // parentheses
            case '(': this.addToken(TokenType.LEFT_PAREN); break;
            case ')': this.addToken(TokenType.RIGHT_PAREN); break;
            case '{': this.addToken(TokenType.LEFT_BRACE); break;
            case '}': this.addToken(TokenType.RIGHT_BRACE); break;
            case '[': this.addToken(TokenType.LEFT_SQUARE); break;
            case ']': this.addToken(TokenType.RIGHT_SQUARE); break;

            // Arithmetics Operator
            case '+': this.addToken(TokenType.PLUS); break;
            case '-': this.addToken(TokenType.MINUS); break;
            case '*': this.addToken(TokenType.STAR); break;
            case '/': this.addToken(TokenType.SLASH); break;

            // Assignment and Comparison Operator
            case '=': this.addToken( this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL); break;
            case '!': this.addToken( this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG); break;
            case '>': this.addToken( this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER); break;
            case '<': this.addToken( this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS); break;

            // string
            case '"': this.readString(); break;

            default:
                if (this.isNumeric(c)){
                    this.readNumber();
                } else if (this.isVarStart(c)) {
                    this.readIdentifier();
                } else if (c.match(/\s/)) {
                    // skip spaces
                    if (c === '\n') this.line++;
                    
                    while(this.peek().match(/\s/)) {
                        if (this.advance() === '\n') this.line++;
                    }
                } else {
                    // report error
                    this.error(`Unknown token '${c}'`);
                }
        }
    }

    private readString(){
        let prevBackSlash = false;
        let value = "";
        
        while(!this.atEnd()){
            let c = this.advance();

            if (!prevBackSlash){
                if (c === '"') break;
                else if (c === '\\') prevBackSlash = true;
            } else {
                prevBackSlash = false
            }

            value += c;
        }

        if (this.previous() !== '"') {
            this.error("Expect '\"' after string");
            return;
        }

        this.addToken(TokenType.STRING, value, DuckType.String);
    }

    private readNumber(){
        while(this.isNumeric(this.peek())){
            this.advance();
        }

        if (this.peekIs('.') && this.isNumeric(this.peekNext())){
            this.advance();

            while(this.isNumeric(this.peek())){                
                this.advance();
            }
        }

        let value = this.source.substring(this.start, this.current);
        this.addToken(TokenType.NUMBER, parseFloat(value), DuckType.Number);
    }

    private readIdentifier(){
        while(this.isVarPart(this.peek())){
            this.advance();
        }

        let id : string = this.source.substring(this.start, this.current);
        let token_type : TokenType = ReservedWords[id] || TokenType.IDENTIFIER;

        switch(token_type){
            case TokenType.TRUE: this.addToken(token_type, true, DuckType.Bool); break;
            case TokenType.FALSE: this.addToken(token_type, false, DuckType.Bool); break;

            case TokenType.TYPE_NUMBER: this.addToken(token_type, null, DuckType.Number); break;
            case TokenType.TYPE_BOOL: this.addToken(token_type, null, DuckType.Bool); break;
            case TokenType.TYPE_STRING: this.addToken(token_type, null, DuckType.String); break;

            default: this.addToken(token_type);
        }
    }

    private advance() : string {
        this.current++;
        return this.previous();
    }

    private previous() : string {
        return this.source.charAt(this.current - 1);        
    }

    private peek() : string {
        if (this.atEnd()) return "\0";
        return this.source.charAt(this.current);
    }

    private peekNext() : string {
        if (this.current + 1 >= this.source.length) return '\0';
        else return this.source.charAt(this.current + 1);
    }

    private peekIs(expected : string) : boolean{
        return this.peek() === expected;
    }

    private atEnd() : boolean {
        return this.current >= this.source.length;
    }

    private match(expected : string) : boolean {
        if (this.peekIs(expected)){
            this.advance();
            return true;
        }
        
        return false;
    }

    private isNumeric(char : string) : boolean {
        return !!char.match(/\d/);
    }

    private isVarStart(char : string) : boolean {
        return !!char.match(/[_a-zA-Z]/);
    }

    private isVarPart(char : string) : boolean {
        return !!char.match(/[_a-zA-Z0-9]/);
    }

    private addToken(tokenType : TokenType, literal? : any, literalType? : DuckType){
        const lexeme = this.source.substring(this.start, this.current);
        this.tokens.push(new Token(tokenType, lexeme, this.line, literal, literalType));
    }

    private error(message : string){
        Reporter.report(this.line, message);
    }
}