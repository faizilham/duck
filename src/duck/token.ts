import {DuckType} from "./types"
import { Duck } from ".";

export enum TokenType {
    EOF,

    // Delimiters
    COMMA, DOT,

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

    // Keywords
    IF, ELSE, WHILE, LET,
    PRINT, // temporarily, later will changed to standard lib function
}

export class Token {
    constructor(public tokenType : TokenType, public lexeme : string, public literal : any, public literalType : DuckType, public line : Number) {}

    public stringify() : string {
        return `Token(${TokenType[this.tokenType]}, '${this.lexeme}', ${this.literal}, ${DuckType[this.literalType] || null}, ${this.line})`;
    }
}