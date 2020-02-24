import { LogEntry, Hash } from '../../../definitions';
import * as React from 'react';
import { connect } from 'react-redux';
import { RootState } from '../../../reducers';

type BranchGrapProps = {
    hideGraph: boolean;
    logEntries: LogEntry[];
    itemHeight?: number;
    updateTick?: number;
};

// type LineInfo = { hash: string, path: any, x?: number, wasFictional: boolean, line: Line };
type LineInfo = { path: any; x?: number; wasFictional: boolean; line: Line };
let branches: LineInfo[] = [];
const _COLORS = ['#ffab1d', '#fd8c25', '#f36e4a', '#fc6148', '#d75ab6', '#b25ade', '#6575ff', '#7b77e9', '#4ea8ec', '#00d0f5', '#4eb94e', '#51af23', '#8b9f1c', '#d0b02f', '#d0853a', '#a4a4a4',
    '#ffc51f', '#fe982c', '#fd7854', '#ff705f', '#e467c3', '#bd65e9', '#7183ff', '#8985f7', '#55b6ff', '#10dcff', '#51cd51', '#5cba2e', '#9eb22f', '#debe3d', '#e19344', '#b8b8b8',
    '#ffd03b', '#ffae38', '#ff8a6a', '#ff7e7e', '#ef72ce', '#c56df1', '#8091ff', '#918dff', '#69caff', '#3ee1ff', '#72da72', '#71cf43', '#abbf3c', '#e6c645', '#eda04e', '#c5c5c5',
    '#ffd84c', '#ffb946', '#ff987c', '#ff8f8f', '#fb7eda', '#ce76fa', '#90a0ff', '#9c98ff', '#74cbff', '#64e7ff', '#7ce47c', '#85e357', '#b8cc49', '#edcd4c', '#f9ad58', '#d0d0d0',
    '#ffe651', '#ffbf51', '#ffa48b', '#ff9d9e', '#ff8de1', '#d583ff', '#97a9ff', '#a7a4ff', '#82d3ff', '#76eaff', '#85ed85', '#8deb5f', '#c2d653', '#f5d862', '#fcb75c', '#d7d7d7',
    '#fff456', '#ffc66d', '#ffb39e', '#ffabad', '#ff9de5', '#da90ff', '#9fb2ff', '#b2afff', '#8ddaff', '#8bedff', '#99f299', '#97f569', '#cde153', '#fbe276', '#ffc160', '#e1e1e1',
    '#fff970', '#ffd587', '#ffc2b2', '#ffb9bd', '#ffa5e7', '#de9cff', '#afbeff', '#bbb8ff', '#9fd4ff', '#9aefff', '#b3f7b3', '#a0fe72', '#dbef6c', '#fcee98', '#ffca69', '#eaeaea',
    '#763700', '#9f241e', '#982c0e', '#a81300', '#80035f', '#650d90', '#082fca', '#3531a3', '#1d4892', '#006f84', '#036b03', '#236600', '#445200', '#544509', '#702408', '#343434',
    '#9a5000', '#b33a20', '#b02f0f', '#c8210a', '#950f74', '#7b23a7', '#263dd4', '#4642b4', '#1d5cac', '#00849c', '#0e760e', '#287800', '#495600', '#6c5809', '#8d3a13', '#4e4e4e',
    '#c36806', '#c85120', '#bf3624', '#df2512', '#aa2288', '#933bbf', '#444cde', '#5753c5', '#1d71c6', '#0099bf', '#188018', '#2e8c00', '#607100', '#907609', '#ab511f', '#686868',
    '#e47b07', '#e36920', '#d34e2a', '#ec3b24', '#ba3d99', '#9d45c9', '#4f5aec', '#615dcf', '#3286cf', '#00abca', '#279227', '#3a980c', '#6c7f00', '#ab8b0a', '#b56427', '#757575',
    '#ff911a', '#fc8120', '#e7623e', '#fa5236', '#ca4da9', '#a74fd3', '#5a68ff', '#6d69db', '#489bd9', '#00bcde', '#36a436', '#47a519', '#798d0a', '#c1a120', '#bf7730', '#8e8e8e'];

type Point = { x: number; y: number };

/**
 * Plan is to create a Branch class, that will encapsulate:
 * - Branch color
 * - Branch information (nodes)
 * - SVG element (will draw the paths on the Svg) via the PathGenerator class.
 */
class PathGenerator {
    private previousPoint?: Point;
    private svgPath?: string;
    private points: number = 0;
    public get path() {
        console.error(this.svgPath);
        return this.svgPath;
    }
    public addPoint(point: Point) {
        if (!this.previousPoint || !this.svgPath) {
            this.addFirstPoint(point);
        } else if (this.previousPoint.x !== point.x) {
            // If the x values are not the same, then lets curve the connection.
            this.connectToLineSmoothly(point);
        } else {
            this.connectToLine(point);
        }
        this.previousPoint = point;
        this.points += 1;
    }
    private addFirstPoint(point: Point) {
        this.svgPath = `M ${point.x} ${point.y} `;
    }
    /**
     * Join two lines using a cubic bezier curve.
     */
    private connectToLineSmoothly(point: Point) {
        if (!this.previousPoint) {
            throw new Error('Previous point not available');
        }

        if (this.points === 1 && point.x > this.previousPoint.x) {
            const handle = Math.abs((point.x - this.previousPoint.x) / 2);
            const startPoint = `${this.previousPoint.x + handle} ${this.previousPoint.y}`;
            const controlPoint = `${point.x} ${this.previousPoint.y}`;
            const endPoint = `${point.x} ${point.y}`;
            this.svgPath += ` C ${startPoint}, ${controlPoint}, ${endPoint}`;
        } else {
            const handle = (point.y - this.previousPoint.y) / 2;
            const startPoint = `${this.previousPoint.x} ${this.previousPoint.y + handle}`;
            const controlPoint = `${point.x} ${point.y - handle}`;
            const endPoint = `${point.x} ${point.y}`;
            this.svgPath += ` C ${startPoint}, ${controlPoint}, ${endPoint}`;
        }
    }
    private connectToLine(point: Point) {
        this.svgPath += ` L ${point.x} ${point.y}`;
    }
}

const context: { branchList: Line[]; svg: SVGSVGElement } = {
    branchList: [],
    // tslint:disable-next-line: no-any
    svg: {} as any
};
let COLORS = _COLORS.slice();

class Line {
    public readonly color: string;
    public readonly svg: SVGPathElement;
    public get points(): ReadonlyArray<Point> {
        return this._points;
    }
    public get lastHash() {
        return this._lastHash;
    }
    private readonly _points: Point[] = [];
    private readonly pathGenerator = new PathGenerator();
    private _lastHash: Hash;
    private lastX?: number;
    constructor(public readonly firstHash: Hash, public readonly wasFictional: boolean) {
        this.color = COLORS.shift();
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.svg.setAttribute('style', `stroke:${this.color}`);
        context.svg.appendChild(this.svg);
        this.addHash(firstHash);
    }
    public addPoint(point: Point) {
        this.pathGenerator.addPoint(point);
    }
    public addX(x: number) {
        this.lastX = x;
    }
    public addY(y: number) {
        this.pathGenerator.addPoint({ x: this.lastX, y });
    }
    public addHash(hash: Hash) {
        this._lastHash = hash;
    }
}

function clearGraph(svg: SVGSVGElement) {
    COLORS = _COLORS.slice();
    context.branchList = [];
    context.svg = svg;
    while (svg.children.length > 0) {
        svg.removeChild(svg.children[0]);
    }
}

function hideGraph(svg: SVGSVGElement, content: HTMLElement) {
    Array.from(content.children).forEach(element => {
        element.setAttribute('style', `${element.getAttribute('style')};padding-left:0px`);
    });
    svg.style.display = 'none';
}


// tslint:disable
// TODO: Think about appending (could be very expensive, but could be something worthwhile)
// Appending could produce a better UX
// Dunno, I think, cuz this way you can see where merges take place, rather than seeing a line vanish off
function drawGitGraph(svg: SVGSVGElement, content: HTMLElement, startAt: number, logEntryHeight: number = 60.8, entries: LogEntry[]) {
    if (startAt === 0) {
        branches = [];
    }
    svg.style.display = '';
    const svgPaths = new Map<SVGElement, string>();
    // Draw the graph
    const circleOffset = 0;
    const standardOffset = (0 + 0.5) * logEntryHeight;
    let currentY = (0 + 0.5) * logEntryHeight;
    let topMostY = (0 + 0.5) * logEntryHeight;
    for (let i = 0; i < startAt; i++) {
        content.children[i].className = 'hidden';
    }
    // Use this for new orphaned branches
    let circlesToAppend: SVGCircleElement[] = [];
    let fictionalBranches: { path: string, x?: number }[] = [];
    let tabbedOnce = false;
    let fictionalBranchesUsed = false;
    let branched = false;
    for (let i = startAt; i < content.children.length; ++i) {
        if (i >= entries.length) {
            break;
        }
        let entry = entries[i];
        let entryElement = content.children[i];
        if (!entry) {
            break;
        }
        let index = 0;
        (entryElement as any).branchesOnLeft = branches.length;

        // Find branches to join
        let childCount = 0;
        let xOffset = 12;
        let removedBranches = 0;
        let branchFound = i === startAt ? true : false;
        // let padParentCount = 0;
        for (let j = 0; j < branches.length;) {
            let branch = branches[j];
            if (branch.line.lastHash.full === entry.hash.full) {
                branchFound = true;
                if (childCount === 0) {
                    // Replace the branch
                    branch.path.setAttribute('d', branch.path.cmds + currentY);
                    svgPaths.set(branch.path, branch.path.cmds + currentY);
                    if (entry.parents.length === 0) {
                        // This is a parent of a commit, but this doesn't have a parent.
                        // Hence we branched from here.
                        branched = true;
                        // Remove from the list of branches as we're done with this.
                        branches.splice(j, 1);
                    } else {
                        // Keep going back until we find a point when we branched.
                        // I.e. keep connecting the points to form a continuing line.
                        // branch.hash = entry.parents[0].full;
                        branch.line.addHash(entry.parents[0]);
                    }
                    index = j;
                    ++j;
                } else {
                    // Join the branch
                    let x = (index + 1) * xOffset;
                    branch.path.setAttribute('d', branch.path.cmds + (currentY - logEntryHeight / 2) + ' L ' + x + ' ' + currentY);
                    svgPaths.set(branch.path, branch.path.cmds + (currentY - logEntryHeight / 2) + ' L ' + x + ' ' + currentY);
                    branches.splice(j, 1);
                    branched = true;
                    ++removedBranches;
                }
                ++childCount;
            } else {
                if (removedBranches !== 0) {
                    let x = (j + 1) * xOffset;
                    branch.path.setAttribute('d', branch.path.cmds + (currentY - logEntryHeight / 2) + ' L ' + x + ' ' + currentY);
                    svgPaths.set(branch.path, branch.path.cmds + (currentY - logEntryHeight / 2) + ' L ' + x + ' ' + currentY);
                }
                ++j;
            }
        }

        // Add new branches
        let xFromFictionalBranch = 0;
        let j = 0;
        for (j = 0; j < entry.parents.length; ++j) {
            let parent = entry.parents[j];
            let x = (index + j + 1) * xOffset;
            if (j !== 0 || branches.length === 0) {
                const newBranch = new Line(parent, false);
                context.branchList.push(newBranch);
                const svgPath = newBranch.svg;
                let obj = {
                    hash: parent.full,
                    path: svgPath,
                    wasFictional: false,
                    line: newBranch
                };
                let origX = (index + 1) * xOffset;
                let origY = currentY === standardOffset ? 0 : currentY;
                origY = currentY;
                if (entry.isLastCommit && !entry.isThisLastCommitMerged) {
                    origY = currentY;
                }
                (svgPath as any).cmds = 'M ' + origX + ' ' + origY + ' L ' + x + ' ' + (currentY + logEntryHeight / 2) + ' L ' + x + ' ';
                // For debugging (we can see incremental drawing).
                svgPath.setAttribute('d', 'M ' + origX + ' ' + origY + ' L ' + x + ' ' + (currentY + logEntryHeight / 2));
                newBranch.addPoint({ x: origX, y: origY });
                newBranch.addPoint({ x, y: (currentY + logEntryHeight / 2) });
                newBranch.addX(x);
                if (fictionalBranches.length === 0 || !fictionalBranchesUsed) {
                    // Re-set the fictional branches if they haven't been used
                    // In case we have a merge as the very first step,
                    // Why? If we have a merge as the first step, then the fictional branch will have to move to the right
                    // due to the second parent which will take another index
                    if (!fictionalBranchesUsed) {
                        fictionalBranches = [];
                    }
                    // Generate at least 10 fictional branches, so we can lay them out neatly
                    for (let counter = 1; counter < 50; counter++) {
                        let newOrigX = (index + 1 + counter) * xOffset;
                        let fictionalBranch = 'M ' + newOrigX + ' ' + currentY + ' L ' + newOrigX + ' ' + topMostY + ' L ' + newOrigX + ' ';
                        fictionalBranches.push({ path: fictionalBranch, x: newOrigX });
                    }
                }
                branchFound = true;
                branches.splice(index + j, 0, obj);
            }
            if (!branchFound && i > 0) {
                index = branches.length;
                const newBranch = new Line(parent, true);
                context.branchList.push(newBranch);
                const svgPath = newBranch.svg;
                fictionalBranchesUsed = true;
                let fictionalBranch = fictionalBranches.splice(0, 1)[0];
                if (entry.isLastCommit && !entry.isThisLastCommitMerged) {
                    // Don't start from the very top, this is the last commit for this branch
                    fictionalBranch.path = 'M ' + fictionalBranch.x + ' ' + currentY + ' L ' + fictionalBranch.x + ' ' + currentY + ' L ' + fictionalBranch.x + ' ';
                }
                if (fictionalBranch.x !== undefined) {
                    xFromFictionalBranch = fictionalBranch.x;
                }
                (svgPath as any).cmds = fictionalBranch.path;
                // For debugging (we can see incremental drawing).
                svgPath.setAttribute('d', fictionalBranch.path);
                svg.appendChild(svgPath);
                let obj: LineInfo = {
                    // hash: parent.full,
                    path: svgPath,
                    wasFictional: true,
                    line: newBranch
                };
                branches.splice(index + j, 0, obj);
            }

            // Incremental updates for debugging
            for (let i = 0; i < branches.length; ++i) {
                let branch = branches[i];
                branch.path.setAttribute('d', branch.path.cmds + currentY);
                svgPaths.set(branch.path, branch.path.cmds + currentY);
            }
        }

        // What does this do?
        let tabBranch = false;
        for (j = index + j; j < branches.length; ++j) {
            tabBranch = true;
            let branch = branches[j];
            let x = (j + 1) * xOffset;
            branch.path.setAttribute('d', branch.path.cmds + (currentY - logEntryHeight / 2) + ' L ' + x + ' ' + currentY);
            branch.path.cmds += (currentY - logEntryHeight / 2) + ' L ' + x + ' ' + currentY + ' L ' + x + ' ';
        }
        tabBranch = tabBranch ? tabBranch : (entry.parents.length > 1 || branched);
        if (tabBranch && fictionalBranches.length > 0) {
            for (let counter = 0; counter < fictionalBranches.length; counter++) {
                let x = (j + 1 + counter) * xOffset;
                let fictionalBranch = fictionalBranches[counter];
                if (tabbedOnce) {
                    fictionalBranch.path += (currentY - logEntryHeight / 2) + ' L ' + x + ' ' + (currentY) + ' L ' + x + ' ';
                }
                else {
                    if (currentY <= logEntryHeight) {
                        fictionalBranch.path += currentY + ' L ' + x + ' ' + logEntryHeight + ' L ' + x + ' ';
                    }
                    else {
                        fictionalBranch.path += currentY + ' L ' + x + ' ' + (currentY + logEntryHeight / 2) + ' L ' + x + ' ';
                    }
                }
                fictionalBranch.x = x;
            }
            tabbedOnce = true;
        }

        let svgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        let cx = ((branchFound || i === 0 ? index : branches.length - 1) + 1) * xOffset;
        if (xFromFictionalBranch > 0) {
            cx = xFromFictionalBranch;
        }

        svgCircle.setAttribute('cx', cx.toString());
        svgCircle.setAttribute('cy', (currentY + circleOffset).toString());
        svgCircle.setAttribute('r', '4');
        // Enabled only for debugging
        svg.appendChild(svgCircle);
        circlesToAppend.push(svgCircle);

        currentY += logEntryHeight;
    }

    branches.forEach(branch => {
        const svgPath = branch.path.cmds + currentY;
        branch.path.setAttribute('d', svgPath);
        svgPaths.set(branch.path, svgPath);
    });

    const lines: Point[][] = [];
    svgPaths.forEach((pathOrSvg, svg) => {
        const points = getPointsFromPath(pathOrSvg);
        lines.push(points);

        // Re-generate the paths with smooth curvy edges.
        const pathGenerator = new PathGenerator();
        points.forEach(point => pathGenerator.addPoint(point));
        svg.setAttribute('d', pathGenerator.path);
    });

    // Sort all points in lines.
    lines.forEach((points, i) => {
        lines[i] = points.sort((a, b) => a.y - b.y);
    });
    for (let i = startAt; i < content.children.length; ++i) {
        let element = content.children[i];
        if (i >= entries.length) {
            break;
        }
        const originalStyle = element.getAttribute('style');
        const pointsAtY = lines.map(points => getPointAtY((i + 1) * logEntryHeight, points));
        const maxX = Math.max(...pointsAtY.map(p => p.x));
        element.setAttribute('style', `${originalStyle};padding-left:${maxX + 12}px`);

    }
    // calculate the height
    if (entries.length > 0 && !isNaN(logEntryHeight)) {
        svg.setAttribute('height', (entries.length * logEntryHeight).toString());
    }
}

function getPointAtY(y: number, points: Point[]): Point {
    y = Math.floor(y);
    // if the first point has has greater y, then ignore.
    // I.e. if this branch/line starts after the required y, then ignore it.
    if (points.length === 0) {
        return { x: 0, y: 0 };
    }
    if (points[0].y > y) {
        return { x: 0, y: 0 };
    }
    // points = points.sort((a, b) => a.y - b.y);
    return points.reduce<Point>((previous, current) => {
        if (current.y === y) {
            return current;
        }
        if (current.y > y) {
            return previous;
        }
        return current;
    }, points[0]);
}
function getPointsFromPath(svgPath: string): Point[] {
    const points: Point[] = [];
    svgPath = svgPath.trim()
    svgPath = svgPath.startsWith('M') ? svgPath.substring(1) : svgPath;
    svgPath.split('L').map(item => item.trim()).forEach(path => {
        const parts = path.split(' ');
        const x = parseInt(parts[0], 10);
        const y = parseInt(parts[1], 10);
        points.push({ x, y });
    });
    return points;
}

class BrachGraph extends React.Component<BranchGrapProps> {
    componentWillReceiveProps(newProps: BranchGrapProps) {
    }
    componentWillUpdate(newProps: BranchGrapProps) {
        if (newProps.hideGraph) {
            hideGraph(this.svg, this.svg.nextSibling as HTMLElement);
            return;
        }
        if (newProps.updateTick === this.props.updateTick) {
            return;
        }

        // Hack, first clear before rebuilding.
        // Remember, we will need to support apending results, as opposed to clearing page
        (window as any).clearG = true;
        if ((window as any).clearG) {
            clearGraph(this.svg);
        }
        drawGitGraph(this.svg, this.svg.nextSibling as HTMLElement, 0, newProps.itemHeight, newProps.logEntries);
        debugger;
        // for (let index = 0; index < 10; index += 1) {
        //     // pages.push(newProps.logEntries.slice(0 * 10, ((index + 1) * 10) - 1));
        //     const page = newProps.logEntries.slice(0 * 10, ((index + 1) * 10) - 1);
        //     try {
        //         drawGitGraph(this.svg, this.svg.nextSibling as HTMLElement, index * 10, newProps.itemHeight, page);
        //     } catch (error) {
        //         console.error(error);
        //     }
        // }
    }

    private svg: SVGSVGElement;
    render() {
        return (
            <svg className='commitGraph' ref={(ref) => this.svg = ref} xmlns='http://www.w3.org/2000/svg'></svg>
        );
    }
}

function mapStateToProps(state: RootState): BranchGrapProps {
    const hideGraph = (state && state.logEntries) && ((state.logEntries.searchText && state.logEntries.searchText.length > 0) ||
        (state.logEntries.file && state.logEntries.file.fsPath && state.logEntries.file.fsPath.length > 0) ||
        (state.logEntries.author && state.logEntries.author.length > 0) || state.logEntries.isLoading
    );

    return {
        logEntries: state.logEntries.items,
        hideGraph,
        itemHeight: state.graph.itemHeight,
        updateTick: state.graph.updateTick
    };
}

export default connect(
    mapStateToProps
)(BrachGraph);
