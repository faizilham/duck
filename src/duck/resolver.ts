/**
 * Resolver resolve variable scoping, and check & infer type for each variable and expression 
 */

import {Expr} from "./ast/expr"
import {TypeExpr} from "./ast/typeexpr"
import {Stmt} from "./ast/stmt"
import { DuckType, Type } from "./types";
import { Token, TokenType } from "./token";
import { Reporter } from "./error"

enum EntryType {
    VAR = 1,
    TYPE
}

class SymbolEntry {
    constructor(public entryType : EntryType, public type : DuckType){

    }
}

class SymbolTable {
    private valueMap : {[s: string] : SymbolEntry}  = {};
    constructor(public parent? : SymbolTable ){}

    public add(name : Token, entryType: EntryType, type: DuckType){
        this.valueMap[name.lexeme] = new SymbolEntry(entryType, type);
    }

    public get(name : Token) : SymbolEntry | undefined {
        let result = this.getLocal(name);

        if (!result && this.parent){
            return this.parent.get(name);
        }

        return result;
    }

    public getLocal(name : Token) : SymbolEntry | undefined {
        return this.valueMap[name.lexeme];
    }

    public size() : number {
        return Object.keys(this.valueMap).length;
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

        if (!variable || (variable.entryType !== EntryType.VAR)) {
            throw this.error(stmt.name, `Attempting to assign undeclared variable ${stmt.name.lexeme}`);
        }

        if (!variable.type.contains(expr)){
            throw this.error(stmt.name, `Unmatched declared and assigned value type: ${variable} and ${expr}`)
        }
    }

    visitBlockStmt(stmt: Stmt.Block): void {
        let currentTable = this.symtable;
        this.symtable = new SymbolTable(this.symtable);        

        for (let statement of stmt.statements){                  
            statement.accept(this);
        }

        stmt.localVars = this.symtable.size();

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

    visitSetIndexStmt(stmt: Stmt.SetIndex): void {
        let target = stmt.target.accept(this);
        let expr = stmt.expr.accept(this);

        if (!target.contains(expr)){
            throw this.error(stmt.token, `Unmatched declared and assigned value type: ${target} and ${expr}`)
        }
    }

    visitStructStmt(stmt: Stmt.Struct): void {
        let parameters : DuckType.Parameter[] = [];

        for (let [member, typeexpr] of stmt.members){
            let type = typeexpr.accept(this);

            parameters.push([member.lexeme, type]);
        }

        let structType = new DuckType.Struct(stmt.name.lexeme, parameters);

        stmt.type = structType;

        this.symtable.add(stmt.name, EntryType.TYPE, structType);        
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

        let type = typeExpr || expr ;
        if (!type) throw this.error(stmt.name, "Unknown variable type");

        if (this.symtable.getLocal(stmt.name)){
            throw this.error(stmt.name, `Identifier ${stmt.name.lexeme} is already declared in this context`);
        }

        stmt.type = type;
        if (!expr){
            stmt.expr = type.defaultValue();
        }

        this.symtable.add(stmt.name, EntryType.VAR, type);
    }

    /** TypeExpression Visitor */
    visitBasicTypeExpr(typeexpr: TypeExpr.Basic): DuckType {
        return typeexpr.type;
    }

    visitListTypeExpr(typeexpr: TypeExpr.List): DuckType {
        return new DuckType.List(typeexpr.element.accept(this));
    }

    visitCustomTypeExpr(typeexpr: TypeExpr.Custom): DuckType {
        let custom = this.symtable.get(typeexpr.name);

        if (!custom || (custom.entryType !== EntryType.TYPE)){
            throw this.error(typeexpr.name, `Unknown type ${typeexpr.name.lexeme}`);
        }

        return custom.type;
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

    visitCallExpr(expr: Expr.Call): DuckType {
        if (expr.callee instanceof Expr.Variable){
            return this.simpleCall(expr)
        }

        let type = expr.callee.accept(this);

        throw this.error(expr.token, `Unknown operator() for type ${type}`);
    }

    simpleCall(expr : Expr.Call) : DuckType {
        let callee = (<Expr.Variable> expr.callee);
        let entry = this.symtable.get(callee.name)

        if (!entry || entry.entryType !== EntryType.TYPE){
            throw this.error(expr.token, `Unknown type ${callee.name.lexeme}`);
        }

        if (!(entry.type instanceof DuckType.Struct)){
            throw this.error(expr.token, `Can't instantiate ${entry.type.toString} using operator()`);
        }

        let struct = entry.type;
        expr.type = struct;
        
        if (expr.parameters.length > 0){
            let paramTypes : [Token | null, DuckType][] = [];

            // visit parameters
            for (let [token, paramType] of expr.parameters){
                paramTypes.push([token, paramType.accept(this)]);
            }

            // rearrange parameters to match its occurence / name

            let memberTypes : DuckType[] = struct.memberNames.map((name) => struct.members[name]);
            let rearranged : Expr.PairParameter[] = [];
            
            memberTypes.forEach((type) => rearranged.push([null, type.defaultValue()]));
            
            for (let i = 0; i < paramTypes.length; i++){
                let [token, paramType] = paramTypes[i];

                let index = i;

                // get actual index if using (X = expr) notation
                if (token){
                    index = struct.memberNames.indexOf(token.lexeme);
                    if (index < 0){
                        throw this.error(token, `Unknown member argument ${token.lexeme}`);
                    }
                }

                // check parameter type
                let expectedType = memberTypes[index];

                if (!expectedType.contains(paramType)){
                    throw this.error(expr.token, `Can't assign argument type ${expectedType} with ${paramType}`)
                }
                
                rearranged[index][1] = expr.parameters[i][1];
            }

            expr.parameters = rearranged;
        }

        return struct;
    }

    visitGroupingExpr(expr: Expr.Grouping): DuckType {
        return expr.inner.accept(this);
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

        if (variable && variable.entryType == EntryType.VAR)
            return variable.type;
        
        throw this.error(expr.name, `Unknown identifier ${expr.name.lexeme}`);
    }
}