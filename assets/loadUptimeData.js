function runSiteCron() {
if (!Object.hasOwn(window,"lastPull") || (window.lastPull < ( Date.now() - (20*1000) )) ) {
console.log("getting data")
let yourDate = new Date()
apihost="status.jh0project.com"
if (Object.hasOwn(window,"realapihost")  ) {
    apihost=window.realapihost
}
if ( !apihost.includes("http://") && !apihost.includes("https://")  ) {
    apihost="https://"+apihost
}
myurl=apihost+"/api/kv/"+yourDate.toISOString().split('T')[0].slice(0, 7)

//fetch('https://status.jh0project.com/api/kv/2025-08').then(function(response) {
fetch(myurl).then(function(response) {
  // response.json() returns a promise, use the same .then syntax to work with the results
  response.json().then(function(mydata){
    // users is now our actual variable parsed from the json, so we can use it
   //users.forEach(function(mydata){      console.log(user.name)    });
    //console.log(JSON.stringify(mydata))
    if (Object.hasOwn(mydata.checks[yourDate.toISOString().split('T')[0]],"summery")  ) {  mydata.checks[yourDate.toISOString().split('T')[0]].summary=mydata.checks[yourDate.toISOString().split('T')[0]].summery  }
    window.curData=mydata
    window.lastPull=Date.now()
    console.log("main_graph")
    // mydata.checks[yourDate.toISOString().split('T')[0]].summary
    var margin = {top: 12, right: 50, bottom: 10, left: 50};
    data=[]
    let moniDown=0
    let moniUp=0
    for (var k in curData.operational){
    let monitorFound=false
    if (typeof curData.operational[k] !== 'function') {
         ///alert("Key is " + k + ", value is" + curData.operational[k]);
        if(curData.operational[k])  { moniUp=moniUp+1 } else { moniDown=moniDown+1 }
        let curmonid=k
        let curmonpingsum=0
        let curmonvalues=0
        let curmonping=0
        for (var dcloc in mydata.checks[yourDate.toISOString().split('T')[0]].summary ) { 
            if(Object.hasOwn(mydata.checks[yourDate.toISOString().split('T')[0]].summary[dcloc],curmonid)) { 
            //console.log("Found "+curmonid+" in "+dcloc)
            monitorFound=true
            curmonpingsum=curmonpingsum+mydata.checks[yourDate.toISOString().split('T')[0]].summary[dcloc][curmonid]["a"]
            curmonvalues=curmonvalues+1
            }
        }
        if(curmonvalues==0) { 
        if( curData.operational[k]  ) { 
           curmonping = 0 
        } else { 
           curmonping=-999999
         }
        } else {
        
        if( curData.operational[k]  ) { 
            curmonping=curmonpingsum/curmonvalues
        } else {
            curmonping=curmonpingsum/curmonvalues*-1
        }
        data.push({"monitorid": curmonid , "ping_value" : curmonping/1000 })
        }
        
       }
    if(!monitorFound) { console.log("no ping data for "+k) ;         data.push({"monitorid": k , "ping_value" : -9.99 }) }
    }
    if(moniDown==0) {
      document.getElementById("statusheader").style.backgroundColor="rgb(46, 204, 113)"
      document.getElementById("mainstatustxt").textContent="All Systems Operational"
    } else {
       if(moniUp==0) {
         document.getElementById("statusheader").style.backgroundColor="rgba(214, 99, 4, 1)"
         document.getElementById("mainstatustxt").textContent="ERROR: All Systems FAILING"
       } else {
         document.getElementById("statusheader").style.backgroundColor="rgba(26, 187, 61, 1)"
         document.getElementById("mainstatustxt").textContent="Partially Degraded"

       }
    }


    data.sort((a, b) => b.ping_value - a.ping_value)
    console.log(JSON.stringify(data))
     if(!document.getElementById("d3-graph-main")) { 
        const overviewcont = document.createElement('div');
        //overviewcont.style['background']  = 'grey';
        //overviewcont.style['background']  = 'rgb(230, 126, 34)';
        
        overviewcont.setAttribute("id", "d3-graph-main" );
        document.getElementById("contwrap").appendChild(overviewcont);
        //document.getElementById("d3-graph-main").style.minHeight="800px"
        document.getElementById("d3-graph-main").style.minHeight=(66+data.length*30).toString()+"px"
     }
    //var width = 960 - margin.left - margin.right,
    //		height = 500 - margin.top - margin.bottom;
    var width = document.getElementById("contwrap").offsetWidth - margin.left - margin.right,
    		height = document.getElementById("d3-graph-main").offsetHeight - margin.top - margin.bottom;
    var svg = d3.select("#d3-graph-main").insert("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    //data=[ { "rank": 2 , "ping_value": 222 , "monitorid": "barmon" }, { "rank": 1 , "ping_value": 200 , "monitorid": "woahmon" } ,{ "rank": 3 , "ping_value": -123 , "monitorid": "foomon" } ]
    // Config
    var cfg = {
      labelMargin: 15,
      xAxisMargin: 10,
      legendRightMargin: 0
    }
    
    var x = d3.scaleLinear()
    	.range([0, width]);
    
    var colour = d3.scaleSequential(d3.interpolatePRGn);
    
    var y = d3.scaleBand()
    	.range([height, 0])
    	.padding(0.1);
    function parse(d) {
      d.rank = +d.rank;
      d.ping_value = +d.ping_value;
      return d;
    }
    
    var legend = svg.append("g")
    	.attr("class", "legend");
    
    legend.append("text")
    	.attr("x", width - cfg.legendRightMargin)
    	.attr("text-anchor", "end")
    	.text("Monitors and Pings");
    
    legend.append("text")
      .attr("x", width - cfg.legendRightMargin)
    	.attr("y", 20)
    	.attr("text-anchor", "end")
    	.style("opacity", 0.5)
    	.text("DOWN: "+moniDown+" | UP: "+moniUp);
          
      y.domain(data.map(function(d) { return d.monitorid; }));
      x.domain(d3.extent(data, function(d) { return d.ping_value; }));
      
      var max = d3.max(data, function(d) { return d.ping_value; });
      colour.domain([-max, max]);
      
      var yAxis = svg.append("g")
      	.attr("class", "y-axis")
      	.attr("transform", "translate(" + x(0) + ",0)")
      	.append("line")
          .attr("y1", 0)
          .attr("y2", height);
      
      var xAxis = svg.append("g")
      	.attr("class", "x-axis")
      	.attr("transform", "translate(0," + (height + cfg.xAxisMargin) + ")")
      	.call(d3.axisBottom(x).tickSizeOuter(0));
      
      var bars = svg.append("g")
      	.attr("class", "bars")
      
      bars.selectAll("rect")
      	.data(data)
      .enter().append("rect")
      	.attr("class", "ping-value")
      	.attr("x", function(d) {
       		return x(Math.min(0, d.ping_value));
      	})
      	.attr("y", function(d) { return y(d.monitorid); })
      	.attr("height", y.bandwidth())
      	.attr("width", function(d) { 
        	return Math.abs(x(d.ping_value) - x(0))
            //return Math.log10(Math.abs(x(d.ping_value) - x(0)))
      	})
      	.style("fill", function(d) {
           //bar colour
           if(d.ping_value > 20 )  {   return "red" ; }
           if(d.ping_value < 0 )  {   return "red" ; }
           if(d.ping_value < 0.5 && d.ping_value > 0  )  {   
            return 'rgba('+(64+d.ping_value*254)+', '+(64+d.ping_value*254)+', 255, 1)'
          //  return "blue" ; 
          }
           if(d.ping_value < 1 && d.ping_value > 0.499999  )  {   
          //  return "green" ; 
            return 'rgba('+(64+d.ping_value*128)+', 255, '+(64+d.ping_value*128)+', 1)'
          }
           if(d.ping_value < 5 && d.ping_value > 1  )  {   
          //  return "yellow" ;
            return 'rgba('+(123+d.ping_value*10)+', 255, '+(63+d.ping_value*3)+', 1)'
          }
           return colour(d.ping_value)
           //if(d.ping_value > 5 )  {   return "yellow" ; }
      	});
      
      var labels = svg.append("g")
      	.attr("class", "labels");
      labels.selectAll("text")
      	.data(data)
      .enter().append("text")
      	.attr("class", "bar-label")
      	.attr("x", x(0))
      	.attr("y", function(d) { return y(d.monitorid )})
      	.attr("dx", function(d) {
        	//let myval=d.ping_value < 0 ? -cfg.labelMargin : cfg.labelMargin
            let myval=d.ping_value < 0 ? 5 : cfg.labelMargin
            if(d.ping_value>0.5 ) { myval=myval+ cfg.labelMargin + cfg.labelMargin   }
            if(d.ping_value>1 ) { myval=myval+ cfg.labelMargin + cfg.labelMargin   }
            if(d.ping_value>2 ) { myval=myval+ cfg.labelMargin + cfg.labelMargin  }
            if(d.ping_value>3 ) { myval=myval+ cfg.labelMargin  }
            if(d.ping_value>5 ) { myval=myval+ cfg.labelMargin  }
            if(d.ping_value>10 ) { myval=myval+ cfg.labelMargin  }
            return myval;
            
      	})
      	.attr("dy", y.bandwidth())
      	.attr("text-anchor", function(d) {
        	//return d.ping_value < 0 ? "start" : "end";
            return d.ping_value < 0 ? "start" : "start";
      	})
      	//.text(function(d) { return d.monitorid })
      	//.text(function(d) {  let updown=(d.ping_value >0) ? "↑" : "↓" ; let mystring= updown+" "+ d.monitorid +" "+ updown +" |  "+ parseFloat(d.ping_value.toString()).toPrecision(3).toString() + " s avg "  ;return mystring})
      	.text(function(d) {  let updown=(d.ping_value >0) ? "↑" : "↓" ; let mystring= updown+" ("+parseFloat(d.ping_value.toString()).toFixed(3).toString().slice(0,5) + "s)  "+ d.monitorid +" "+ updown   ;return mystring})
      	.style("fill", function(d) {
        	 if (d.monitorid == "European Union") {
             return "blue";
           }
           if(d.ping_value < 0 )        {   return "red" ; }
           if(d.ping_value > 9.9999 )   {  return "black" ; }
           if(d.ping_value > 5 )        {   return "blue" ; }
           if(d.ping_value < 9.9999 && d.ping_value > 3  )  {   return "yellow" ; }
           return "black";
      	});
  }); // end json mydata 

}).catch(err => console.error(err));
}
if (document.getElementById("d3-graph-main")) { 
while (document.getElementById("d3-graph-main").childNodes.length > 1) { document.getElementById("d3-graph-main").childNodes[1].remove() } 
}

}

runSiteCron()

//function createDivElement(monitor,operational) {
//    const container = document.createElement('div');
//    container.style['background']  = 'yellow';
//    container.setAttribute("id", "monitorcard_"+monitor);
//    
//    container.classList.add('mui-0');
//    container.classList.add('MuiBox-root');
//    const headline = document.createElement('h2');
//    headline.innerText = 'Your Headline Here';
//    headline.classList.add('MuiTypography-h6');
//    headline.classList.add('MuiTypography-root');
//    headline.style.color="rgb(46, 204, 113)"
//    container.appendChild(headline);
//    const graphDiv = document.createElement('div');
//    graphDiv.setAttribute("id", 'd3-graph_'+monitor);
//    container.appendChild(graphDiv);
//    
//    //const textField = document.createElement('input');
//    //textField.type = 'text';
//    //textField.placeholder = 'Enter text here';
//    //container.appendChild(textField);
//    const textField = document.createElement('p');
//    textField.textContent = 'text111';
//    
//    //document.body.appendChild(container);
//    document.getElementById("contwrap").appendChild(container);
//    
//    // D3.js graph generation (example)
//    const svg = d3.select('#d3-graph_'+monitor)
//                  .append('svg')
//                  .attr('width', 500)
//                  .attr('height', 300);
//    
//    // Example data
//    const data = [30, 86, 168, 234, 200, 100, 300];
//    
//    svg.selectAll('rect')
//       .data(data)
//       .enter()
//       .append('rect')
//       .attr('width', (d) => d)
//       .attr('height', 30)
//       .attr('y', (d, i) => i * 35)
//       .attr('fill', 'blue');
//}
//
//createDivElement("foobar",true);