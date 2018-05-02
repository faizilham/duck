import {Expr} from "./ast/expr"
import {TypeExpr} from "./ast/typeexpr"
import {Stmt} from "./ast/stmt"
import { DuckType, Type } from "./types";
import { Token, TokenType } from "./token";
import { Reporter } from "./error"

class SymbolTable {
    private valueMap : any = {};
    constructor(public parent? : SymbolTable ){}

    public add(name : Token, type: DuckType){
        this.valueMap[name.lexeme] = type;
    }

    public get(name : Token) : DuckType | undefined {
        let result = this.getLocal(name);

        if (!result && this.parent){
            return this.parent.get(name);
        }

        return result;
    }

    public getLocal(name : Token) : DuckType | undefined {
        return this.valueMap[name.lexeme];
    }

    public clear(){
        this.valueMap = {};
    }
}

export class Resolver implements Expr.Visitor<DuckType>, TypeExpr.Visitor<DuckType>, Stmt.Visitor<void> {
    private symtable : SymbolTable = new SymbolTable(); 

    public resolve(statements : Stmt[]){
        this.symtable.clear();

        for (let statement of statements){
            try {
                statement.accept(this);
            } catch(e){}
        }
    }

    error(token: Token, message: string){
        Reporter.report(token.line, message);
        throw null;
    }

    /** Statement Visitor **/

    visitAssignmentStmt(stmt: Stmt.Assignment): void {
        let expr = stmt.expr.accept(this);

        let variable = this.symtable.get(stmt.name);

        if (!variable) {
            throw this.error(stmt.name, `Attempting to assign undeclared variable ${stmt.name.lexeme}`);
        }

        if (variable !== expr){
            throw this.error(stmt.name, `Unmatched declared and assigned value type: ${variable} and ${expr}`)
        }
    }

    visitBlockStmt(stmt: Stmt.Block): void {
        let currentTable = this.symtable;
        this.symtable = new SymbolTable(this.symtable);

        for (let statement of stmt.statements){
            statement.accept(this);
        }

        this.symtable = currentTable;
    }

    visitExpressionStmt(stmt: Stmt.Expression): void {
        stmt.expr.accept(this);
    }

    visitIfStmt(stmt: Stmt.If): void {
        let condition = stmt.condition.accept(this);

        if (!DuckType.Bool.contains(condition)){
            throw this.error(stmt.token, "Condition has to be boolean");
        }

        stmt.thenBranch.accept(this);

        if (stmt.elseBranch){
            stmt.elseBranch.accept(this);
        }
    }

    visitWhileStmt(stmt: Stmt.While): void {
        let condition = stmt.condition.accept(this);

        if (!DuckType.Bool.contains(condition)){
            throw this.error(stmt.token, "Condition has to be boolean");
        }

        stmt.body.accept(this);
    }

    visitVarDeclStmt(stmt: Stmt.VarDecl): void {
        let expr, typeExpr;        

        if (stmt.expr){
            expr = stmt.expr.accept(this);
        }

        if (stmt.typeExpr){
            typeExpr = stmt.typeExpr.accept(this);

            if (expr && !typeExpr.contains(expr)){
                throw this.error(stmt.name, `Unmatched declared and initiated type: ${typeExpr} and ${expr}`);
            } 
        } else if (expr instanceof DuckType.List && expr.isNullList()){
            throw this.error(stmt.name, "Can't infer empty array type from assignment");
        }

        let type = expr || typeExpr;
        if (!type) throw this.error(stmt.name, "Unknown variable type");

        if (!expr) {
            stmt.expr = this.defaultVarTypeValue(stmt.name, type);
        }

        if (this.symtable.getLocal(stmt.name)){
            throw this.error(stmt.name, `Identifier ${stmt.name.lexeme} is already declared in this context`);
        }

        this.symtable.add(stmt.name, type);
    }

    defaultVarTypeValue (vartoken : Token, type : DuckType) : Expr {
        switch(type.type){
            case Type.Bool:
                return new Expr.Literal(false, type);
            case Type.Number:
                return new Expr.Literal(0, type);
            case Type.String:
                return new Expr.Literal("", type);            
            case Type.List:
                return new Expr.List(new Token(TokenType.LEFT_SQUARE, "[", vartoken.line), []);
            default:
                throw this.error(vartoken, `Unknown default value for type ${type}`);
        }
    }

    /** TypeExpression Visitor */
    visitBasicTypeExpr(typeexpr: TypeExpr.Basic): DuckType {
        return typeexpr.type;
    }

    visitListTypeExpr(typeexpr: TypeExpr.List): DuckType {
        return new DuckType.List(typeexpr.element.accept(this));
    }

    /** Expression Visitor */

    visitBinaryExpr(expr: Expr.Binary): DuckType {
        let left = expr.left.accept(this);
        let right = expr.right.accept(this);

        switch(expr.operator.tokenType){
            case TokenType.PLUS:
                if (left == right){
                    if (DuckType.Number.contains(left) || DuckType.String.contains(left)){
                        return left;
                    }
                }
            break;

            case TokenType.MINUS:
            case TokenType.STAR:
            case TokenType.SLASH:
                if (left == right && DuckType.Number.contains(left)){
                    return left;
                }
            break;

            case TokenType.BANG_EQUAL:
            case TokenType.EQUAL_EQUAL:
                if (left == right){
                    return DuckType.Bool;
                }
            break;

            case TokenType.GREATER:
            case TokenType.GREATER_EQUAL:
            case TokenType.LESS:
            case TokenType.LESS_EQUAL:
                if (left == right && DuckType.Number.contains(left)){
                    return DuckType.Bool;
                }
            break;
        }

        throw this.error(expr.operator, `Unknown operator ${expr.operator.lexeme} for type ${left} and ${right}`);
    }

    visitGroupingExpr(expr: Expr.Grouping): DuckType {
        return expr.accept(this);
    }

    visitIndexingExpr(expr: Expr.Indexing): DuckType {
        let collection = expr.collection.accept(this);

        if (!(collection instanceof DuckType.List)){
            throw this.error(expr.token, `Unknown operator[] for type ${collection}`);
        }

        if (!collection.elementType){
            throw this.error(expr.token, `Unknown type ${collection}`);            
        }

        let index = expr.index.accept(this);

        if (!DuckType.Number.contains(index)){
            throw this.error(expr.token, `Can't use type ${collection} as index`);
        }
        
        return collection.elementType;
    }

    visitLiteralExpr(expr: Expr.Literal): DuckType {
        return expr.type;
    }

    visitListExpr(expr: Expr.List): DuckType {
        let elementType;

        let i = 0;
        for (let element of expr.elements){
            let type = element.accept(this);
            
            if (!elementType || type.contains(elementType)){ // if first element or first is subtype of current
                elementType = type;
            } else if (!elementType.contains(type)){
                throw this.error(expr.token, `Unmatch element type #${i} ${type} from element type #0 ${elementType}`);
            }
            
            i++;
        }

        return new DuckType.List(elementType);
    }

    visitUnaryExpr(expr: Expr.Unary): DuckType {
        let right = expr.right.accept(this);

        switch(expr.operator.tokenType){
            case TokenType.MINUS:
                if (DuckType.Number.contains(right)) return right;
            break;
            case TokenType.BANG:
                if (DuckType.Bool.contains(right)) return right;
            break;
        }

        throw this.error(expr.operator, `Unknown operator ${expr.operator.lexeme} for type ${right}`);
    }

    visitVariableExpr(expr: Expr.Variable): DuckType {
        let variable = this.symtable.get(expr.name);

        if (variable)
            return variable;
        
        throw this.error(expr.name, `Unknown identifier ${expr.name.lexeme}`);
    }
}