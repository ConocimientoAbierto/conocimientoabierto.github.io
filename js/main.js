var currentStep = 0
var chart = d3.select('#chart')
var margin = {top: 30, right: 30, bottom: 30, left: 30}

// SVG and banner variables
var banner = document.getElementById('banner')
var chartSize
var svgSize
var logoSize

// Calculate the svg and banner size
setSizes()

// Use the extracted size to set the size of an SVG element
var svg = chart
  .append('svg')
    .attr('width', svgSize.width + margin.left + margin.right)
    .attr('height', svgSize.height + margin.top + margin.bottom)
  .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

// Graph variables
var graph
var link
var node
var text
var linkedByIndex = { }
var nodesOrden = [ 'Equipo', 'Datos', 'Gobierno Abierto', 'Genero', 'Comunidad e innovación', 'Tecnología Cívica' ]

// Proyect description html
var proyectDivTitle = document.getElementsByClassName('proyectTitle')[ 0 ]
var proyectDivContent = document.getElementsByClassName('proyectContent')[ 0 ]
var proyectDivImg = document.getElementsByClassName('proyectImg')[ 0 ]

// Nodes colors
function getColor (d) {
  return d === 'Datos' ? '#377eb8'
         : d === 'Genero' ? '#4daf4a'
         : d === 'Gobierno Abierto' ? '#984ea3'
         : d === 'Tecnología Cívica' ? '#ff7f00'
         : d === 'Comunidad e innovación' ? '#ffff33'
         : d === 'Equipo' ? '#a65628'
         : '#ffffff'
}

// Initialize the simulation
var simulation = d3.forceSimulation()
    .force('charge', d3.forceManyBody())
    .force('center', d3.forceCenter(svgSize.width / 2, svgSize.height / 2))
    .force('link', d3.forceLink().id(function (d) { return d.id }))
    .alphaMin(0.6)
    .on('end', function () {
      chart.classed('hidden', false)
      d3.select('.arrow').classed('hidden', false)
      d3.select('#loading').classed('hidden', true)

      moveNodes(0, 3000)
      initScroll()
    })

// Load data and createt the graph
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
      .attr('stroke-width', function (d) { return Math.sqrt(d.value) })

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

  // Add the text
  text = svg.append('g')
      .attr('class', 'labels')
    .selectAll('text')
    .data(graph.nodes)
    .enter().append('text')
      .attr('x', function (d) { return d.step0.x })
      .attr('y', function (d) { return d.step0.y })
      .text(function (d) { return d.id })

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
  Update positions with transition
  ================================
*******************************************************************/
function ticked (time) {
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
}

function moveNodes (stepNumber, timeAnimation) {
  graph.nodes.forEach(function (d) {
    var key = 'step' + String(stepNumber)
    d.x = d[ key ].x
    d.y = d[ key ].y
    d.r = d[ key ].r
  })

  ticked(timeAnimation)
}

/*******************************************************************
  Hover in/out over some node
  ===========================
*******************************************************************/
function mouseOver (d) {
  /*
  Mouse hover over node
  */
  // Resalto las conexiones del nodo
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

  // Update .proyect description
  proyectDivTitle.innerHTML = d.id
  //proyectDivContent.innerHTML = '<p>spam</p>'
  proyectDivImg.src = d.img
}

function mouseOut (d) {

}

function isConnected (a, b) {
  // Return true if two nodes are connected
  return linkedByIndex[a.index + ',' + b.index] ||
         linkedByIndex[b.index + ',' + a.index] ||
         a.index === b.index
}

/*******************************************************************
  Nodes, links styles
  ===================
*******************************************************************/
function highlightArea (area) {
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

  proyectDivTitle.innerHTML = d.id
  //proyectDivContent.innerHTML = '<p>spam</p>'
  proyectDivImg.src = d.img
}

function removehighlightArea () {
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
      if (i === 1) {
        // Show the banner
        d3.select('#banner').classed('fadeIn', true)
        d3.select('#banner').classed('fadeOut', false)
        // Hidden proyect description
        d3.select('#proyectDescription').classed('fadeIn', false)
        d3.select('#proyectDescription').classed('fadeOut', true)
      }
      else if (i > 1) {
        // Hidden the banner
        d3.select('#banner').classed('fadeIn', false)
        d3.select('#banner').classed('fadeOut', true)
        // Show proyect description
        d3.select('#proyectDescription').classed('hidden', false)
        d3.select('#proyectDescription').classed('fadeIn', true)
        d3.select('#proyectDescription').classed('fadeOut', false)
      }

      if (i === 0) {
        moveNodes(0, 1000)
      } else if (i === 1) {
        removehighlightArea()

        if (currentStep < i) {
          moveNodes(1, 1000)
          setTimeout(function () { moveNodes(2, 1000) }, 1000)
        } else {
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

      currentStep = i
    })
}

/* particlesJS.load(@dom-id, @path-json, @callback (optional)) */
particlesJS.load('chart', '../data/particles.json', function () {
  console.log('particles.js loaded - callback')
})

/*******************************************************************
 Resize functions
 ================
*******************************************************************/
function setSizes () {
  /*
    Set SVG size
  */

  // Extract the width and height that was computed by CSS.
  chartSize = {width: window.innerWidth, height: window.innerHeight}
  svgSize = {width: chartSize.width - margin.left - margin.right,
    height: chartSize.height - margin.top - margin.bottom}

  // Logo size
  logoSize = {width: banner.offsetWidth, height: banner.offsetHeight}
}

window.addEventListener('resize', function () {
  /*
    Redraw based on the new size whenever the browser window is resized.
  */

  // Hidden chart
  chart.classed('hidden', true)
  d3.select('#loading').classed('hidden', false)

  // Update svg size
  setSizes()
  d3.select('svg')
    .attr('width', svgSize.width + margin.left + margin.right)
    .attr('height', svgSize.height + margin.top + margin.bottom)

  // Calculate new postions and update
  calulateStepPostitions()
  moveNodes(currentStep)

  // SHow chart
  chart.classed('hidden', false)
  d3.select('#loading').classed('hidden', true)
})
