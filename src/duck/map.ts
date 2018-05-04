export class Map<T> {
    private mapping : any;

    constructor (mapping? : any) {
        this.setMapping(mapping || {});
    }

    private setMapping(mapping : any){
        this.mapping = mapping;
        this.mapping.__proto__ = null;
    }

    public clear(){
        this.setMapping({});
    }

    public copy(other : Map<T>){
        for (let key in other.mapping){
            this.mapping[key] = other.mapping[key];
        }
    }

    public get(key : string) : T {
        return this.mapping[key];
    }

    public set(key : string, value : T) {
        this.mapping[key] = value;
    }

    public keys() : string[]{
        return Object.keys(this.mapping);
    }
}