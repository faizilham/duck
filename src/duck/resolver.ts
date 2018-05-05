/**
 * Resolver resolve variable scoping, and check & infer type for each variable and expression 
 */

import {Expr} from "./ast/expr"
import {TypeExpr} from "./ast/typeexpr"
import {Stmt} from "./ast/stmt"
import { DuckType, Type } from "./types";
import { Token, TokenType } from "./token";
import { Reporter } from "./error"
import { Map } from "./map";

enum EntryType {
    VAR = 1,
    TYPE
}

class SymbolEntry {
    constructor(public entryType : EntryType, public type : DuckType){

    }
}

class SymbolTable {
    private valueMap = new Map<SymbolEntry>();
    constructor(public parent? : SymbolTable ){}

    public add(name : Token, entryType: EntryType, type: DuckType){
        this.valueMap.set(name.lexeme, new SymbolEntry(entryType, type));
    }

    public get(name : Token) : SymbolEntry | undefined {
        let result = this.getLocal(name);

        if (!result && this.parent){
            return this.parent.get(name);
        }

        return result;
    }

    public getLocal(name : Token) : SymbolEntry | undefined {
        return this.valueMap.get(name.lexeme);
    }

    public size() : number {
        return Object.keys(this.valueMap).length;
    }

    public clear(){
        this.valueMap.clear()
    }
}

export class ReturnValues {
    public returnPoints : [Token, DuckType][] = [];
    public complete = false;

    constructor(token?: Token, type?: DuckType){
        if (token && type){
            this.returnPoints.push([token, type]);
            this.complete = true;
        }
    }
    
    public add(ret : ReturnValues | void, overrideComplete : boolean = false){
        if (!ret) return;

        this.returnPoints.push(...ret.returnPoints);
        if (overrideComplete) this.complete = ret.complete;
        else if (ret.complete) this.complete = true;
    }

    public addDefault(token: Token, type: DuckType = DuckType.Void){
        this.returnPoints.push([token, type]);
    }
}

export class Resolver implements Expr.Visitor<DuckType>, TypeExpr.Visitor<DuckType>, Stmt.Visitor<ReturnValues | void> {
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

    visitAssignmentStmt(stmt: Stmt.Assignment): ReturnValues | void {
        let expr = stmt.expr.accept(this);

        let variable = this.symtable.get(stmt.name);

        if (!variable || (variable.entryType !== EntryType.VAR)) {
            throw this.error(stmt.name, `Attempting to assign undeclared variable ${stmt.name.lexeme}`);
        }

        if (!variable.type.contains(expr)){
            throw this.error(stmt.name, `Unmatched declared and assigned value type: ${variable} and ${expr}`)
        }
    }

    visitBlockStmt(stmt: Stmt.Block): ReturnValues | void {
        let currentTable = this.symtable;
        this.symtable = new SymbolTable(this.symtable);

        try {
            let returnVal = new ReturnValues();

            for (let statement of stmt.statements){                  
                returnVal.add(statement.accept(this));
            }

            stmt.localVars = this.symtable.size();

            return returnVal;
        } finally {
            this.symtable = currentTable;
        }
    }

    visitExpressionStmt(stmt: Stmt.Expression): ReturnValues | void {
        stmt.expr.accept(this);
    }

    visitFuncStmt(stmt: Stmt.Func): ReturnValues | void {
        let currentTable = this.symtable;
        this.symtable = new SymbolTable(this.symtable);

        try {
            // visit parameter and add to function symtable
            let parameters : [string, DuckType][] = [];
            for (let [token, typeExpr] of stmt.parameters){
                let paramType = typeExpr.accept(this);

                parameters.push([token.lexeme, paramType]);
                this.symtable.add(token, EntryType.VAR, paramType);
            }

            let returnType = DuckType.Void;

            if (stmt.returnType){
                returnType = stmt.returnType.accept(this);
            }

            let funcType = new DuckType.Func(stmt.name.lexeme, parameters.map(x => x[1]), returnType);
            stmt.type = funcType;

            // add function to upper context symtable
            currentTable.add(stmt.name, EntryType.VAR, funcType);

            let returnVal = new ReturnValues();   

            for (let statement of stmt.body){
                returnVal.add(statement.accept(this));
            }

            if (!returnVal.complete){
                if (!funcType.returnType.contains(DuckType.Void)){
                    throw this.error(stmt.name, `Incomplete return values for function ${stmt.name.lexeme}`);
                }
            }
    
            // check return value in every branch

            for (let [token, type] of returnVal.returnPoints){
                if (!funcType.returnType.contains(type)){
                    throw this.error(token, `Cannot return value of type ${type} for function ${stmt.name.lexeme} ${funcType}`);
                }
            }
            
        } finally{
            this.symtable = currentTable;
        }
    }

    visitIfStmt(stmt: Stmt.If): ReturnValues | void {
        let condition = stmt.condition.accept(this);

        if (!DuckType.Bool.contains(condition)){
            throw this.error(stmt.token, "Condition has to be boolean");
        }

        let returnVal = new ReturnValues();

        returnVal.add(stmt.thenBranch.accept(this));

        if (stmt.elseBranch){
            returnVal.add(stmt.elseBranch.accept(this), true);
        } else {
            returnVal.complete = false;
        }

        return returnVal;
    }

    visitReturnStmt(stmt: Stmt.Return): ReturnValues | void {
        let type = DuckType.Void;

        if (stmt.expr){
            type = stmt.expr.accept(this);
        }

        return new ReturnValues(stmt.token, type);
    }

    visitSetIndexStmt(stmt: Stmt.SetIndex): ReturnValues | void {
        let target = stmt.target.accept(this);
        let expr = stmt.expr.accept(this);

        if (!target.contains(expr)){
            throw this.error(stmt.token, `Unmatched declared and assigned value type: ${target} and ${expr}`)
        }
    }

    visitSetMemberStmt(stmt: Stmt.SetMember): ReturnValues | void {
        let target = stmt.target.accept(this);
        let expr = stmt.expr.accept(this);

        if (!target.contains(expr)){
            throw this.error(stmt.token, `Unmatched member and assigned value type: ${target} and ${expr}`)
        }
    }

    visitStructStmt(stmt: Stmt.Struct): ReturnValues | void {
        let parameters : DuckType.Parameter[] = [];

        for (let [member, typeexpr] of stmt.members){
            let type = typeexpr.accept(this);

            parameters.push([member.lexeme, type]);
        }

        let structType = new DuckType.Struct(stmt.name.lexeme, parameters);

        stmt.type = structType;

        this.symtable.add(stmt.name, EntryType.TYPE, structType);
    }

    visitWhileStmt(stmt: Stmt.While): ReturnValues | void {
        let condition = stmt.condition.accept(this);

        if (!DuckType.Bool.contains(condition)){
            throw this.error(stmt.token, "Condition has to be boolean");
        }

        return stmt.body.accept(this);
    }

    visitVarDeclStmt(stmt: Stmt.VarDecl): ReturnValues | void {
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
                        expr.type = left
                    }
                }
            break;

            case TokenType.MINUS:
            case TokenType.STAR:
            case TokenType.SLASH:
                if (left == right && DuckType.Number.contains(left)){
                    expr.type = left                    
                }
            break;

            case TokenType.BANG_EQUAL:
            case TokenType.EQUAL_EQUAL:
                if (left == right){
                    expr.type = DuckType.Bool                    
                }
            break;

            case TokenType.GREATER:
            case TokenType.GREATER_EQUAL:
            case TokenType.LESS:
            case TokenType.LESS_EQUAL:
                if (left == right && DuckType.Number.contains(left)){
                    expr.type = DuckType.Bool;
                }
            break;
        }

        if (expr.type) return expr.type;

        throw this.error(expr.operator, `Unknown operator ${expr.operator.lexeme} for type ${left} and ${right}`);
    }

    visitCallExpr(expr: Expr.Call): DuckType {
        if (expr.callee instanceof Expr.Variable){
            return this.simpleCall(expr)
        }

        let type = expr.callee.accept(this);

        // TODO: change this to proper function call check
        if (type instanceof DuckType.Func && type.parameters.length === 0){
            return type.returnType;
        }

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
            const memberNames = struct.members.keys();
            const memberTypes = memberNames.map((name) => struct.members.get(name));

            let rearranged : Expr.PairParameter[] = [];
            
            memberTypes.forEach((type) => rearranged.push([null, type.defaultValue()]));
            
            for (let i = 0; i < paramTypes.length; i++){
                let [token, paramType] = paramTypes[i];

                let index = i;

                // get actual index if using (X = expr) notation
                if (token){
                    index = memberNames.indexOf(token.lexeme);
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
        expr.type = expr.inner.accept(this);
        return expr.type
    }

    visitGetMemberExpr(expr: Expr.GetMember): DuckType {
        let object = expr.object.accept(this);

        let memberFunc = object.getMethod(expr.member.lexeme);

        if (memberFunc){
            return memberFunc;
        }
        
        if (!(object instanceof DuckType.Struct)){
            throw this.error(expr.token, `Unknown operator . for type ${object}`);
        }

        let member = object.members.get(expr.member.lexeme);

        if (!member){
            throw this.error(expr.token, `Unknown member ${expr.member.lexeme} for type ${object}`);
        }

        expr.type = member;

        return member;
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

        expr.type = collection.elementType;
        
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

        expr.type = new DuckType.List(elementType);

        return expr.type;
    }

    visitUnaryExpr(expr: Expr.Unary): DuckType {
        let right = expr.right.accept(this);

        switch(expr.operator.tokenType){
            case TokenType.MINUS:
                if (DuckType.Number.contains(right)) expr.type = right;
            break;
            case TokenType.BANG:
                if (DuckType.Bool.contains(right)) expr.type = right;
            break;
        }

        if (expr.type) return expr.type;

        throw this.error(expr.operator, `Unknown operator ${expr.operator.lexeme} for type ${right}`);
    }

    visitVariableExpr(expr: Expr.Variable): DuckType {
        let variable = this.symtable.get(expr.name);

        if (variable && variable.entryType == EntryType.VAR){
            expr.type = variable.type;
            return variable.type;
        }
        
        throw this.error(expr.name, `Unknown identifier ${expr.name.lexeme}`);
    }
}