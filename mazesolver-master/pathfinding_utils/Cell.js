class Cell {
    constructor(row, col, isWalkable) {
        this.row = row;
        this.col = col;
        this.isWalkable = isWalkable;
        this.parent = null; // ref to parent (cell visited prior to this one), used for path reconstruction
    }

    setParent(parentCell) {
        this.parent = parentCell;
    }
}

module.exports = Cell;