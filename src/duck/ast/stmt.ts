import { Token } from '../token';
import { Expr } from './expr';
import { TypeExpr } from './typeexpr';
import { DuckType } from '../types';

export abstract class Stmt {
    public abstract accept<T>(visitor : Stmt.Visitor<T>) : T;
}

export namespace Stmt {
    export type Parameter = [Token, TypeExpr];
    export class Assignment extends Stmt {
        constructor(public name: Token, public expr: Expr) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitAssignmentStmt(this);
        }
    }

    export class Block extends Stmt {
        constructor(public statements: Stmt[], public localVars: number = 0) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitBlockStmt(this);
        }
    }

    export class Expression extends Stmt {
        constructor(public expr: Expr) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitExpressionStmt(this);
        }
    }

    export class If extends Stmt {
        constructor(public token: Token, public condition: Expr, public thenBranch: Stmt, public elseBranch?: Stmt) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitIfStmt(this);
        }
    }

    export class SetIndex extends Stmt {
        constructor(public target: Expr.Indexing, public token: Token, public expr: Expr) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitSetIndexStmt(this);
        }
    }

    export class SetMember extends Stmt {
        constructor(public target: Expr.GetMember, public token: Token, public expr: Expr) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitSetMemberStmt(this);
        }
    }

    export class Struct extends Stmt {
        constructor(public name: Token, public members: Parameter[], public type?: DuckType) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitStructStmt(this);
        }
    }

    export class While extends Stmt {
        constructor(public token: Token, public condition: Expr, public body: Stmt) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitWhileStmt(this);
        }
    }

    export class VarDecl extends Stmt {
        constructor(public name: Token, public typeExpr?: TypeExpr, public expr?: Expr, public type?: DuckType) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitVarDeclStmt(this);
        }
    }

    export interface Visitor<T> {
        visitAssignmentStmt(stmt: Assignment) : T;
        visitBlockStmt(stmt: Block) : T;
        visitExpressionStmt(stmt: Expression) : T;
        visitIfStmt(stmt: If) : T;
        visitSetIndexStmt(stmt: SetIndex) : T;
        visitSetMemberStmt(stmt: SetMember) : T;
        visitStructStmt(stmt: Struct) : T;
        visitWhileStmt(stmt: While) : T;
        visitVarDeclStmt(stmt: VarDecl) : T;
    }
}
