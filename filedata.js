function GetTreeRepresentation(rootNode)
{
    let nodeChildren = {}
    let nodeData = {}
    let nodeArrows = {}
    let register = (node) =>
    {
        // add my personal data
        nodeData[node.id] = {
            text : node.text,
            color : node.color,
            text_color : node.text_color,
            arrow_color : node.arrow_color,
            draw_circle : node.draw_circle,
            isRoot : !node.parent,
        }

        // add my arrows
        nodeArrows[node.id] = []
        for (let i=0; i<node.arrows.length; i++)
        {
            let arrow = node.arrows[i]
            if (arrow && arrow.from && arrow.to)
            {
                nodeArrows[node.id].push({
                    from : arrow.from.id,
                    to : arrow.to.id,
                    anchorPoints : [arrow.xoff1, arrow.yoff1, arrow.xoff2, arrow.yoff2],
                })
            }
        }

        // add my children, recursively
        nodeChildren[node.id] = []
        for (const child in node.children)
        {
            register(node.children[child])
            nodeChildren[node.id].push(node.children[child].id)
        }
    }

    register(rootNode)

    return {
        nodeChildren : nodeChildren,
        nodeData : nodeData,
        nodeArrows : nodeArrows,
        maxIndex : CurrentNodeID,
        version : 3.1,
    }
}

function LoadTreeRepresentation(treeRep)
{
    SpatialHash = {}
    let idToNode = {}
    let root = null

    for (const id in treeRep.nodeChildren)
    {
        let data = treeRep.nodeData[id]
        let node = idToNode[id]
        if (!node)
        {
            node = new TreeNode(0,0)
            idToNode[id] = node
            AddToSpatialHash(node.x,node.y, node)
        }

        node.text = data.text
        node.color = data.color
        node.text_color = data.text_color || "dark"
        node.arrow_color = data.arrow_color || "dark"
        node.draw_circle = data.draw_circle == undefined ? false : data.draw_circle
        node.id = id
        node.recalculate()
        node.countSpaces()

        if (data.isRoot)
            root = node

        for (let i=0; i<treeRep.nodeChildren[id].length; i++)
        {
            let childNode = idToNode[treeRep.nodeChildren[id][i]]
            if (!childNode)
            {
                childNode = new TreeNode(0,0)
                AddToSpatialHash(childNode.x,childNode.y, childNode)
                idToNode[treeRep.nodeChildren[id][i]] = childNode
            }

            childNode.parent = node
            node.children.push(childNode)
            childNode.recalculate()
        }
    }

    root.recalculate()
    Trees[0] = root
    CurrentNodeID = treeRep.maxIndex+1

    for (const id in treeRep.nodeArrows)
    {
        for (let i=0; i<treeRep.nodeArrows[id].length; i++)
        {
            let arrowData = treeRep.nodeArrows[id][i]
            let nodeFrom = idToNode[arrowData.from]
            let nodeTo = idToNode[arrowData.to]
            let arrow = new Arrow(nodeFrom)
            arrow.to = nodeTo
            if (nodeTo)
                nodeFrom.arrows.push(arrow)

            arrow.xoff1 = arrowData.anchorPoints[0]
            arrow.yoff1 = arrowData.anchorPoints[1]
            arrow.xoff2 = arrowData.anchorPoints[2]
            arrow.yoff2 = arrowData.anchorPoints[3]
        }
    }
}

const UndoMax = 20

function AddChange(dontStore)
{
    let treeRep = GetTreeRepresentation(Trees[0])

    // return if there is no difference between this state and last state
    //print(UndoIndex, UndoList[UndoIndex], UndoList[UndoIndex] && JSON.stringify(treeRep) === JSON.stringify(UndoList[UndoIndex]))
    if (UndoList[UndoIndex] && JSON.stringify(treeRep) === JSON.stringify(UndoList[UndoIndex])) { return }

    UndoIndex += 1
    UndoList[UndoIndex] = treeRep

    if (!dontStore)
        storeItem("treeBackup", treeRep)

    while (UndoIndex > UndoMax)
    {
        UndoList.splice(0,1)
        UndoIndex -= 1
    }

    MostCurrentUndoIndex = UndoIndex
}

function AttemptAddChange()
{
    if (TreeHasChanged)
    {
        TreeHasChanged = false
        AddChange()
    }
}

function UndoChange()
{
    SelectionList = {}
    if (UndoIndex > 1)
    {
        UndoIndex -= 1
        LoadTreeRepresentation(UndoList[UndoIndex])
    }
}

function RedoChange()
{
    SelectionList = {}
    if (UndoIndex < MostCurrentUndoIndex)
    {
        UndoIndex += 1
        LoadTreeRepresentation(UndoList[UndoIndex])
    }
}
