import { Token } from '../token';
import { DuckType } from '../types';

export abstract class TypeExpr {
    public abstract accept<T>(visitor : TypeExpr.Visitor<T>) : T;
}

export namespace TypeExpr {
    export class Basic extends TypeExpr {
        constructor(public typeExpr: Token, public type: DuckType) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitBasicTypeExpr(this);
        }
    }

    export interface Visitor<T> {
        visitBasicTypeExpr(typeexpr: Basic) : T;
    }
}
