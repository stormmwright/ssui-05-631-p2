
import {SizeConfig, SizeConfigLiteral} from "./SizeConfig.js";
import { DrawContext, HJust } from "./Util.js";
import { Group } from "./Group.js";
import { Spring } from "./Spring.js";

//===================================================================
// A row layout class designed to work with springs and struts layout.
// To use this class children in the row should be separated by Spring
// and Strut objects.  Springs will stretch and compress, struts are fixed
// length, neither produces any output (except in there *_debug versions,
// which are useful for understanding how they work).  
// 
// This object must be given a width either by its parent during layout, 
// or simply in advance when the parent isn't doing layout (e.g., when the 
// parent is a Group, TopObject, DrawnObjectBase, etc.).  It's height will
// automatically be set to a fixed size which matches the maximum natural size
// among it's children.
//
// Children are sized in width using springs and struts layout rules.  In height
// they are set to their natural size.  Children are positioned to be stacked
// horizontall.  Vertically they are top, center, or bottom justified
// (as controlled by the hJustification property of this object).
//===================================================================
export class Row extends Group { 

    public constructor(  
        x : number = 0,      // x position in parent coordinate system 
        y: number = 0,       // y position in parent coordinate system 
        w: number = 42,      // initial width
        h: number = 13,      // initial height
        vis: boolean = true) // initial visibility status
    {
        super(x,y,w,h,vis);

        // initial sizing configuration is fixed in width and elastic in height
        this._wConfig = SizeConfig.fixed(w);
        this._hConfig = SizeConfig.elastic(h); 
        
        // justification type for layout along the height of the column
        this._hJustification = 'top';
    }

    //-------------------------------------------------------------------
    // Properties
    //-------------------------------------------------------------------

    // How are objects positioned vertically along the height of the column
    protected _hJustification : HJust = 'top';
    public get hJustification() {return this._hJustification;}
    public set hJustification(v : HJust) {
        if (v !== this._hJustification) {
            this._hJustification = v;
            this.damageAll();  // we have damaged our layout...
        }
    }

    //. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
  
    // Override w setter so it enforces fixed size
    public override get w() {return super.w;}
    public override set w(v : number) {
        if (v !== this._w) {
            // damage at old size
            this.damageAll();
            this._w = v;
            this._wConfig = SizeConfig.fixed(v);
            // damage at new size
            this.damageAll();
        } 
    }

    //-------------------------------------------------------------------
    // Methods
    //-------------------------------------------------------------------  

    // Determine the size configuration for this object assuming that the size 
    // configuration of each child object is up to date (i.e., that _doChildSizing() 
    // has just been called).  
    //
    // This sets our width configuration to be the sum of the children 
    // (min is sum of mins, natual is sum of naturals, and max is sum of maxes). 
    // Our height `configuration is set based on the (piecewise) maximum of our children 
    // (min is the max of the child mins, natural is the max of the child naturals, and 
    // max is the max of the child maxes)
    //
    // Our height min is set to hold all the children at their min size (the maximum
    // of the child mins).  Our natural size is set to hold all the children at their
    // natural sizes (the maximum of child naturals).  Finally our max is set to the 
    // minimum of the child maximums.
    //
    // Our width is set to the width determined by stacking our children horizontally.
    protected override _doLocalSizing() : void {
        //=== YOUR CODE HERE ===
        let sum: SizeConfigLiteral = {min: 0, nat: 0, max: 0}, max: SizeConfigLiteral = {min: 0, nat: 0, max: 0};

        for (let child of this._children) {
            sum = SizeConfig.add(sum, child.wConfig);
            max = SizeConfig.maximum(max, child.hConfig);
        }

        this.wConfig = sum;
        this.hConfig = max;
    }

    //. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    // This method adjusts the width of the children to do horizontal springs and struts 
    // layout within the row.  If there is excess space beyond the natural size of 
    // the children, Spring objects are expanded (all by the same amount) to cause 
    // the layout to fill the height of the column.  Non-spring objects are currently
    // not stretched (even if there are no springs).  If there is a shortfall in the 
    // natural size space available we attempt to make up the shortfall by compressing 
    // child objects. Springs are compressed to 0.  Then non-spring children are 
    // compressed within the limits set by their configuration (specifically their 
    // wConfig.min value). No child objects are compressed past their configured min
    // (if the shortfall can't be made up, later clipping will occur at the right).
    protected _adjustChildren() {
        // get measurements from our children
        const [natSum, availCompr, numSprings] = this._measureChildren();

        // given space allocation from our parent, determine how much horizontal excess 
        // we have in comparison to our children's natural sizes 
        let excess = this.w - natSum;

        // handle positive excess and negative excess (AKA shortfall) as separate cases
        if (excess >= 0) {
            this._expandChildSprings(excess, numSprings);
        } else { // negative excess (AKA shortfall) case
            // zero out the size of all the springs
            for (let child of this.children) {
                if (child instanceof Spring) child.w = 0;
            }

            // if we have no compressability we are done
            // (we will end up clipping at the right as a fallback strategy)
            if (availCompr === 0) return; 
            
            // don't try to make up more shortfall than we have available ompressability.  
            // (any remander will force a clip at the right)
            let shortfall = -excess; 
            shortfall = Math.min(availCompr, shortfall);

            // compress the child sizes to make up the shortfall
            this._compressChildren(shortfall, availCompr);
        }
    }

    //. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    // Measure aspects of the children in preparation for adjusting sizes.  This 
    // returns an tuple  with the following computed values (all numbers):
    //   * natSum      The sum of natural sizes of the non-spring children
    //   * availCompr  The total compression available across the non-spring children
    //                 Compression for a single child is the difference between their
    //                 natural and minimum sizes (nat-min).
    //   * numSprings  The number of springs among the child objects.
    protected _measureChildren() : [number, number, number] {
        // walk across the children and measure the following:
        // - sum up the natural size of all our non-spring children
        // - how much non-spring objects can compress (nat-min) total
        // - how many springs we have
        let natSum = 0;  
        let availCompr = 0; 
        let numSprings = 0; 

        //=== YOUR CODE HERE ===
        for (let child of this._children) {
            if (!(child instanceof Spring)) {
                natSum += child.wConfig.nat;
                availCompr += child.wConfig.nat - child.wConfig.min;
            } else {
                numSprings++;
            }
        }

        return [natSum, availCompr, numSprings];
    }

    //. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    // Expand  our child springs to add space in total equal to the given amount of
    // excess space. Expansion space is allocated evenly among the springs. If there 
    // are no child springs, this does nothing (which has the eventual effect of leaving 
    // the space at the right of the row as a fallback strategy).
    protected _expandChildSprings(excess : number, numSprings : number) : void {
        //=== YOUR CODE HERE ===
        let springExcess = excess / numSprings;

        for (let child of this._children) {
            if (child instanceof Spring) {
                child.w = springExcess;
            }
        }
    }

    //. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    // Contract our child objects to make up the given amount of shortfall.  Springs
    // have a zero natural size (which is already assumed in calculating the shortfall),
    // so we need to make up the shortfall among the other children by 
    // using space that they can compress (i.e., the difference between their min and
    // natural sizes).  Each child is compressed by a fraction of the total compression
    // that is equal to its fraction of the available compressability.
    protected _compressChildren(
        shortfall : number,   // amount we need to compress overall
        availCompr : number)  // total compressability across all children
    {
        // each child will be able to cover a fraction (possibly 0%) of the total 
        // compressabilty across all the children. we calculate the fraction for 
        // each child, then subtract that fraction of the total shortfall 
        // from the natural height of that child, to get the assigned height.
        for (let child of this.children) {
            //=== YOUR CODE HERE ===
            let childCompr: number = (child.w - child.minW) / availCompr;
            child.w = child.w - (childCompr / shortfall);
        }
}

    //. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    // Do the local portion of the top down pass which sets the final 
    // size and position of the immediate children of this object.  
    // This assumes that the sizing configuration of all objects has already 
    // been done in a prior pass, and that our parent has completed its layout and 
    // set our size (or our size was otherwise set). 
    //
    // We use _adjustChidren() to resize the children to match the mandated 
    // width of this row. Then we position the children stacked horizontally,
    // and justified vertically (based on hJustification).  Any horizontal space
    // excess that _adjustChildren() couldn't allocate to springs will appear at 
    // the left of the stack.  Any horzontal shortfall that couldn't be compressed
    // out of children will result in clipping at the left.
    protected override _completeLocalLayout() : void { 
        // if we have no children we can be done now (and avoid some edge cases)
        if (this.children.length === 0) return;

        // set the width of all the children 
        this._adjustChildren();

        // set child heights to their natural heights 
        let hMax : number = 0;
        for (let child of this.children) {
            child.h = child.hConfig.nat;
            if (child.h > hMax) hMax = child.h;
        }
        
        // shrinkwrap: set our height to the height of the tallest child
        this.h = this.hConfig.nat = hMax;

        // stack up the children in the horizontal
        let xpos : number = 0;
        for (let child of this.children) {
            child.x = xpos;
            xpos += child.w;
        }

        // apply our justification setting for the vertical

        //=== YOUR CODE HERE ===
        for (let child of this._children) {
            switch (this.hJustification) {
                case "top":
                    child.y = 0;
                    break;
                case "center":
                    child.y = (this.h - child.h) / 2;
                    break;
                case "bottom":
                    child.y = this.h - child.h;
                    break;
            }
        }
    }

    //. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

}

//===================================================================

export class Row_debug extends Row { 

    public constructor(  
        x : number = 0,      // x position in parent coordinate system 
        y: number = 0,       // y position in parent coordinate system 
        w: number = 42,      // initial width
        h: number = 13,      // initial height
        vis: boolean = true) // initial visibility status
    {
        super(x,y,w,h,vis);
    }

    //. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

    protected override _drawSelfOnly(ctx: DrawContext) : void { 
        ctx.fillStyle = 'thistle';
        ctx.fillRect(0,0,this.w,this.h);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(0,0,this.w,this.h);
        
        super._drawSelfOnly(ctx); 
    }

    //. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
    public draw(ctx : DrawContext) : void { 
        if (this.visible) {
            this._drawSelfOnly(ctx);
            this._drawChildren(ctx);

            // also draw an extra box on top of children 
            ctx.strokeStyle = 'black';
            ctx.strokeRect(0,0,this.w,this.h);
        }
        
        
    }
} // end of Row_debug class

//===================================================================