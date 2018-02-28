// SVG and banner variables
var chart = d3.select('#chart')
var banner = document.getElementById('banner')
var chartSize
var svgSize
var logoSize
var margin
var svg

//
var currentStep = 0
var breakPoint = 576

// Graph variables
var graph
var link
var node
var text
var linkedByIndex = { }
var nodesOrden = [ 'Equipo', 'Datos', 'Gobierno Abierto', 'Genero', 'Comunidad e innovación', 'Tecnología Cívica' ]

// Proyect description html
var divDescription = document.getElementById('proyectDescription')
var divDescriptionSmall = document.getElementById('proyectDescriptionSmall')

// Append SVG ans set the correct size
svg = chart
  .append('svg')
    .attr('width', 0)
    .attr('height', 0)
  .append('g')
    .attr('transform', 'translate(0,0)')

updateSvgSize()

// Nodes colors
function getColor (d) {
  return d === 'Datos' ? '#377eb8'
         : d === 'Equipo' ? '#a65628'
         : d === 'Genero' ? '#4daf4a'
         : d === 'Gobierno Abierto' ? '#984ea3'
         : d === 'Tecnología Cívica' ? '#ff7f00'
         : d === 'Comunidad e innovación' ? '#ffff33'
         : '#ffffff'
}

// Create the force simulation
var simulation = d3.forceSimulation()
    .force('charge', d3.forceManyBody())
    .force('center', d3.forceCenter(svgSize.width / 2, svgSize.height / 2))
    .force('link', d3.forceLink().id(function (d) { return d.id }))
    .alphaMin(0.6)
    .on('end', function () {
      // Show the chart and hide the loading spinner
      chart.classed('hidden', false)
      d3.select('.arrow').classed('hidden', false)
      d3.select('#loading').classed('hidden', true)

      initScroll()
    })

// Load data and create the graph
d3.json('data/graph.json', function (error, graphData) {
  if (error) throw error

  graph = graphData
  calulateStepPostitions()

  // Add the links
  link = svg.append('g')
      .attr('class', 'link')
    .selectAll('line')
    .data(graph.links)
    .enter().append('line')

  // Add the nodes
  node = svg.append('g')
      .attr('class', 'nodes')
    .selectAll('circle')
    .data(graph.nodes)
    .enter().append('circle')
      .attr('r', 7)
      .attr('fill', function (d) { return getColor(d.area) })
      .on('mouseover', mouseOver)
      .on('mouseout', mouseOut)
      .on('click', function (d) {
        if (d.id === d.area) {
          var hash = '#' + d.id.toLowerCase().replace(/ /g, '_')
          window.location.hash = hash
        }
      })

  // Add the text
  text = svg.append('g')
      .attr('class', 'labels')
    .selectAll('text')
    .data(graph.nodes)
    .enter().append('text')
      .attr('x', function (d) { return d.step0.x })
      .attr('y', function (d) { return d.step0.y })
      .text(function (d) { return d.id })
      .call(wrap, 100)

  // .text(function (d) { wrap(d.id, 50) })

  simulation
      .nodes(graph.nodes)
      .on('tick', ticked)

  simulation.force('link')
      .links(graph.links)

  // Calculate matrix of connectios
  graph.links.forEach(function (d) {
    linkedByIndex[d.source.index + ',' + d.target.index] = 1
  })
})

/*******************************************************************
  Update positions and translate function
  =======================================
*******************************************************************/
function ticked (time) {
  /*
    Update nodes, links and text positions
  */
  time = (typeof time === 'undefined' ? 0 : time)

  node.transition()
      .duration(time)
      .attr('cx', function (d) { return d.x })
      .attr('cy', function (d) { return d.y })
      .attr('r', function (d) { return d.r })

  link.transition()
      .duration(time)
      .attr('x1', function (d) { return d.source.x })
      .attr('y1', function (d) { return d.source.y })
      .attr('x2', function (d) { return d.target.x })
      .attr('y2', function (d) { return d.target.y })

  text.transition()
      .duration(time)
      .attr('x', function (d) {
        var r = (typeof d.r === 'undefined' ? 0 : d.r)
        return d.x + r + 10
      })
      .attr('y', function (d) { return d.y + 5 })
      .each(function (d, i) {
        var x = d.x + (typeof d.r === 'undefined' ? 0 : d.r) + 10
        var y = d.y + 5
        d3.select(this).selectAll('tspan')
          .transition()
          .duration(time)
          .attr('x', x)
          .attr('y', y)
      })
}

function moveNodes (stepNumber, timeAnimation) {
  /*
    Move the nodes
  */
  graph.nodes.forEach(function (d) {
    var key = 'step' + String(stepNumber)
    d.x = d[ key ].x
    d.y = d[ key ].y
    d.r = d[ key ].r
  })

  ticked(timeAnimation)
}

function wrap (text, width) {
  /*
    Function stiller to Mike. Ty!
    https://bl.ocks.org/mbostock/7555321
  */
  text.each(function () {
    var text = d3.select(this)
    var words = text.text().split(/\s+/).reverse()
    var word
    var line = []
    var lineNumber = 0
    var lineHeight = 1.1 // ems
    var y = text.attr('y')
    var x = text.attr('x')
    var dy = 0 // parseFloat(text.attr("dy")),
    var tspan = text.text(null).append('tspan').attr('x', x).attr('y', y).attr('dy', dy + 'em')

    while (word = words.pop()) {
      line.push(word)
      tspan.text(line.join(' '))
      if (tspan.node().getComputedTextLength() > width) {
        line.pop()
        tspan.text(line.join(' '))
        line = [word]
        tspan = text.append('tspan').attr('x', x).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word)
      }
    }
  })
}
/*******************************************************************
  Nodes hover in/out
  ==================
*******************************************************************/
function mouseOver (d) {
  /*
    On mouse hover in over node, highlight link, nodes and
    text connectedd to the node.
  */
  link
    .transition(500)
      .style('stroke-opacity', function (o) {
        return o.source === d || o.target === d ? 1 : 0.2
      })

  node
    .transition(500)
      .style('opacity', function (o) {
        return isConnected(o, d) ? 1.0 : 0.2
      })

  text
    .transition(500)
      .style('opacity', function (o) {
        return isConnected(o, d) ? 1.0 : 0
      })
}

function mouseOver2 (d) {
  /*
    On mouse hover in over node, update proyect description div
  */
  // Big description
  divDescription.getElementsByTagName('h2')[0].innerHTML = d.id
  // proyectDivContent.innerHTML = '<p>spam</p>'
  divDescription.getElementsByTagName('img')[0].src = d.img

  // Small description
  divDescriptionSmall.getElementsByTagName('h2')[0].innerHTML = d.id
  // proyectDivContent.innerHTML = '<p>spam</p>'
}

function mouseOut (d) {
  /*
    On mouse hover out over node, do ...
  */
}

function isConnected (a, b) {
  /*
    Return true if two nodes are connected
  */
  return linkedByIndex[a.index + ',' + b.index] ||
         linkedByIndex[b.index + ',' + a.index] ||
         a.index === b.index
}

/*******************************************************************
  Highlight areas, nodes
  ======================
*******************************************************************/
function highlightArea (area) {
  /*

  */
  var d = graph.nodes.filter(function (d) {
    return d.id === area
  })[0]

  link
    .transition(1000)
      .style('stroke-opacity', function (o) {
        return o.source === d || o.target === d ? 1 : 0.2
      })

  node
    .transition(1000)
      .style('opacity', function (d) {
        return d.area === area ? 1 : 0.2
      })

  text
    .transition(1000)
      .style('opacity', function (d) {
        return d.area === area ? 1 : 0
      })

  divDescription.getElementsByTagName('h2')[0].innerHTML = d.id
  // proyectDivContent.innerHTML = '<p>spam</p>'
  divDescription.getElementsByTagName('img')[0].src = d.img
}

function highlightNode (nodeId) {
  /*

  */
  var d = graph.nodes.filter(function (d) {
    return d.id === nodeId
  })[0]

  node
    .transition(1000)
      .style('opacity', function (d) {
        return d.id === nodeId ? 1 : 0.2
      })

  // Small description
  divDescriptionSmall.getElementsByTagName('h2')[0].innerHTML = d.id
  // proyectDivContent.innerHTML = '<p>spam</p>'
}

function removeHighlightArea () {
  /*

  */
  link
    .transition(1000)
      .style('stroke-opacity', 1)

  node
    .transition(1000)
      .style('opacity', 1)

  text
    .transition(1000)
      .style('opacity', 0)
}

/*******************************************************************
  Calculate nodes's steps positions
  =================================
*******************************************************************/
function calulateStepPostitions () {
  // Center the nodes in the window
  graph.nodes.forEach(function (d) {
    d.fx = svgSize.width / 2
    d.fy = svgSize.height / 2
    d.step_1 = {x: svgSize.width / 2, y: svgSize.height / 2, r: 0}
  })

  // Calculate nodes position step0
  graph.nodes.forEach(function (d) {
    var position = createNodesInitialPosition()
    d.step0 = {x: position.x, y: position.y, r: 7}
  })

  // Calculate nodes position step1
  graph.nodes.forEach(function (d) {
    graph.nodes.forEach(function (dd) {
      // Node position
      if (d.area === dd.id) {
        d.step1 = {x: dd.step0.x, y: dd.step0.y, r: 0}
      }
    })

    if (d.area === d.id) {
      d.step1 = {x: d.step0.x, y: d.step0.y, r: 20}
    }
  })

  // Calculate nodes positions step2
  graph.nodes.forEach(function (d) {
    var offset = nodesOrden.indexOf(d.area) + 1
    var r = (d.area === d.id ? 20 : 0)
    d.step2 = {x: 40, y: svgSize.height / 7 * offset, r: r}
  })

  // Calculate nodes positions from step3 to step8
  for (var i = 0; i < nodesOrden.length; i++) {
    graph.nodes.forEach(function (d) {
      d['step' + String(3 + i)] = d.step2
    })
  }

  for (var i = 0; i < nodesOrden.length; i++) {
    var filterNodes = graph.nodes.filter(function (d) {
      return d.area === nodesOrden[i] && d.area !== d.id
    })

    for (var j = 0; j < filterNodes.length; j++) {
      filterNodes[j]['step' + String(3 + i)] = {
        x: svgSize.width * 1 / 3,
        y: svgSize.height / (filterNodes.length + 1) * (j + 1),
        r: 7
      }
    }
  }
}

/*******************************************************************
  Generate random initial nodes positions
  =======================================

  **********************************
  *        *    Area 1    *        *
  *        ****************        *
  * Area 0 *     LOGO     * Area 2 *
  *        ****************        *
  *        *   Area 3     *        *
  **********************************

*******************************************************************/
function createNodesInitialPosition () {
  // Random int number [0, 4)
  var choise = Math.floor(Math.random() * 4)

  return choise === 0 ? area0()
       : choise === 1 ? area1()
       : choise === 2 ? area2()
       : area3()
}

function area0 () {
  // the 35 is a "padding-top" for the legend
  var x = Math.random() * (svgSize.width - logoSize.width) / 2
  var y = Math.random() * (svgSize.height - 35) + 35
  return {x: x, y: y}
}

function area1 () {
  // the 35 is a "padding-top" for the legend
  var x = (svgSize.width - logoSize.width) / 2 + Math.random() * logoSize.width
  var y = Math.random() * ((svgSize.height - logoSize.height) / 2 - 35) + 35
  return {x: x, y: y}
}

function area2 () {
  // the 35 is a "padding-top" for the legend
  var x = logoSize.width + (svgSize.width - logoSize.width) / 2 +
          Math.random() * (svgSize.width - logoSize.width) / 2
  var y = Math.random() * (svgSize.height - 35) + 35
  return {x: x, y: y}
}

function area3 () {
  var x = (svgSize.width - logoSize.width) / 2 + Math.random() * logoSize.width
  var y = logoSize.height + (svgSize.height - logoSize.height) / 2 +
          Math.random() * (svgSize.height - logoSize.height) / 2
  return {x: x, y: y}
}

/*******************************************************************
 Scroll events
 =============
*******************************************************************/
function initScroll () {
  d3.graphScroll()
    .offset(500)
    .graph(d3.selectAll('#graph'))
    .container(d3.select('#container'))
    .sections(d3.selectAll('#sections > .step'))
    .on('active', function (i) {
      //
      actionScroll(i)

      currentStep = i
    })
}

function actionScroll (i) {
  //
  removeHighlightArea()

  if (i <= 1) {
    // Show the banner
    d3.select('#banner').classed('fadeIn', true)
    d3.select('#banner').classed('fadeOut', false)

    d3.select('#proyectDescription').classed('hidden', true)
    d3.select('#proyectDescriptionSmall').classed('hidden', true)
  } else if (i > 1) {
    // Hidden the banner
    d3.select('#banner').classed('fadeIn', false)
    d3.select('#banner').classed('fadeOut', true)
  }

  // Update mouse hover over node
  if (i !== 0) {
    node.on('mouseover', mouseOver2)
  } else {
    node.on('mouseover', mouseOver)
  }

  //
  if (window.innerWidth > breakPoint) {
    actionsBigWindows(i)
  } else {
    actionsSmallWindows(i)
  }
}

function actionsSmallWindows (i) {
  if (i <= 1) {
    // Hidden proyect description
    d3.select('#proyectDescriptionSmall').classed('fadeIn', false)
    d3.select('#proyectDescriptionSmall').classed('fadeOut', true)
  } else if (i > 1) {
    // Show proyect description
    d3.select('#proyectDescriptionSmall').classed('hidden', false)
    d3.select('#proyectDescriptionSmall').classed('fadeIn', true)
    d3.select('#proyectDescriptionSmall').classed('fadeOut', false)
  }

  if (i === 0) {
    moveNodes('_1', 1000)
  } else if (i === 1) {
    moveNodes(2, 1000)
  } else if (i === 2) {
    moveNodes(2, 1000)
    highlightNode('Equipo')
  } else if (i === 3) {
    moveNodes(2, 1000)
    highlightNode('Datos')
  } else if (i === 4) {
    moveNodes(2, 1000)
    highlightNode('Gobierno Abierto')
  } else if (i === 5) {
    moveNodes(2, 1000)
    highlightNode('Genero')
  } else if (i === 6) {
    moveNodes(2, 1000)
    highlightNode('Comunidad e innovación')
  } else if (i === 7) {
    moveNodes(2, 1000)
    highlightNode('Tecnología Cívica')
  }
}

function actionsBigWindows (i) {
  if (i <= 1) {
    // Hidden proyect description
    d3.select('#proyectDescription').classed('fadeIn', false)
    d3.select('#proyectDescription').classed('fadeOut', true)
  } else if (i > 1) {
    // Show proyect description
    d3.select('#proyectDescription').classed('hidden', false)
    d3.select('#proyectDescription').classed('fadeIn', true)
    d3.select('#proyectDescription').classed('fadeOut', false)
  }

  if (i === 0) {
    moveNodes(0, 1000)
  } else if (i === 1) {
    if (currentStep < i) {
      moveNodes(1, 1000)
      setTimeout(function () { moveNodes(2, 1000) }, 1000)
    } else if (currentStep > i) {
      moveNodes(2, 1000)
      setTimeout(function () { moveNodes(1, 1000) }, 1000)
    }
  } else if (i === 2) {
    moveNodes(3, 1000)
    highlightArea('Equipo')
  } else if (i === 3) {
    moveNodes(4, 1000)
    highlightArea('Datos')
  } else if (i === 4) {
    moveNodes(5, 1000)
    highlightArea('Gobierno Abierto')
  } else if (i === 5) {
    moveNodes(6, 1000)
    highlightArea('Genero')
  } else if (i === 6) {
    moveNodes(7, 1000)
    highlightArea('Comunidad e innovación')
  } else if (i === 7) {
    moveNodes(8, 1000)
    highlightArea('Tecnología Cívica')
  }
}

particlesJS.load('chart', '../data/particles.json', function () {
  console.log('particles.js loaded - callback')
})

/*******************************************************************
 Resize functions
 ================
*******************************************************************/
function updateSvgSize () {
  /*
    Set SVG size based on window size
  */
  // Extract window width and height
  chartSize = {width: window.innerWidth, height: window.innerHeight}

  // Set margin depending the window size
  if (window.innerWidth > breakPoint) {
    margin = {top: 30, right: 30, bottom: 30, left: 30}
  } else {
    margin = {top: 20, right: 0, bottom: 0, left: 0}
  }

  // SVG and logo size
  svgSize = {width: chartSize.width - margin.left - margin.right,
    height: chartSize.height - margin.top - margin.bottom}
  logoSize = {width: banner.offsetWidth, height: banner.offsetHeight}

  d3.select('svg')
    .attr('width', svgSize.width + margin.left + margin.right)
    .attr('height', svgSize.height + margin.top + margin.bottom)
  svg.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
}

window.addEventListener('resize', function () {
  /*
    Redraw based on the new size whenever the browser window is resized.
  */
  // Hidden chart
  chart.classed('hidden', true)
  d3.select('#loading').classed('hidden', false)

  // Update svg size
  updateSvgSize()

  d3.select('#proyectDescription').classed('hidden', true)
  d3.select('#proyectDescriptionSmall').classed('hidden', true)

  // Remove highlight
  removeHighlightArea()

  // Calculate new postions and update
  calulateStepPostitions()

  // Move the nodes
  /*
  if (window.innerWidth > breakPoint) {
    actionsBigWindows(currentStep)
  } else {
    actionsSmallWindows(currentStep)
  }
  */
  actionScroll(currentStep)

  // SHow chart
  chart.classed('hidden', false)
  d3.select('#loading').classed('hidden', true)
})
