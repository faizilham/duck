import { DuckType } from "./types"

export enum TokenType {
    EOF,

    // Delimiters
    SEMICOLON, COMMA, DOT, COLON,

    // Parentheses
    LEFT_PAREN, RIGHT_PAREN, LEFT_BRACE, RIGHT_BRACE,

    // Arithmetics and Logics Operator
    PLUS, MINUS, STAR, SLASH, AND, OR,

    // Assignment and Comparison Operator
    BANG, BANG_EQUAL, 
    EQUAL, EQUAL_EQUAL,
    GREATER, GREATER_EQUAL,
    LESS, LESS_EQUAL,

    // Literals
    IDENTIFIER, STRING, NUMBER,
    TRUE, FALSE,

    // Basic types
    TYPE_NUMBER, TYPE_STRING, TYPE_BOOL,

    // Keywords
    IF, ELSE, WHILE, LET,
    PRINT, // temporarily, later will changed to standard lib function
}

export class Token {
    constructor(public tokenType : TokenType, public lexeme : string, public line : number, public literal? : any, public literalType? : DuckType) {}

    public stringify() : string {
        let type = (this.literalType === undefined) ?
            null :
            this.literalType.toString()
        ;
        return `Token(${TokenType[this.tokenType]}, '${this.lexeme}', ${this.literal}, ${type}, ${this.line})`;
    }
}