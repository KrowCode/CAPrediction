
// Sends an XMLHttpRequest to the server, asking for data 
// The first argument should contain the URL on the server, with
// the query, and the second should be the name of the callback 
// function.  The callback gets one parameter, containing the 
// requested data.
var count = 0;

function makeRequest(requestString, callbackFunction) {
    
    // first, make a request object
    var req = new XMLHttpRequest();
    
    // set up callback function
    // "onreadystatechange" method is called a bunch of times 
    // as the request makes its way out to the internet and back
    req.onreadystatechange = function() {
        if (req.readyState === XMLHttpRequest.DONE) {
            // the whole process is over
            if (req.status === 200) { // status 200 means all went well! 
                var resp = req.response;  // response shows up in the object
                callbackFunction(resp);     // call the callback function
            } else {
                console.log("Problem requesting data from server");
                console.log("Response code ",req.status);
            }
        }
    }

    var reqURL = "/query?"+requestString;
    req.open('GET', reqURL, true);  // load up the request string
    req.send(null);    // and send it off!
}

function makeHuffRequest()
{
    var req = new XMLHttpRequest();

    req.onreadystatechange = function(){
        if(req.readyState === XMLHttpRequest.DONE){
            if(req.status === 200) {
                var resp = req.response;
                pollsCallback(resp);
            } else{
                console.log("Problem requesting data from server");
                console.log("Response code ", req.status);
            }
        }
    }

    var reqURL = "/query?getHuffData";
    req.open('GET', reqURL, true);
    req.send(null);
}

makeHuffRequest();

function pollsCallback(resp)
{
    var huffData = JSON.parse(resp);
    var questionList = [huffData[0].questions, huffData[1].questions, huffData[2].questions];
    var pollNames = [];
    var subpop = [];
    var contest = "2016 California Democratic Presidential Primary";
    console.log(huffData);
    for(var i = 0; i < questionList.length; i++)
    {
        pollNames.push(huffData[i].pollster);
        for (var j=0; j <questionList[i].length; j++) {
            if (questionList[i][j].name == contest) {
                subpop.push(questionList[i][j].subpopulations);
                for (var k=0; k<subpop.length; k++) {
                   // console.log(subpop[k]);
                }
            }
        }
    }
    // console.log(subpop[1][1].responses);

    var pollDiv;
    var pollDivText;

    for(var p = 0; p < huffData.length; p++)
    {
        pollDiv = document.getElementById("poll" + (p+1));
        resultDiv = document.getElementById("result" + (p+1));
        resultDivText = document.createTextNode("Hillary: " + subpop[p][0].responses[0].value + " Bernie: " + subpop[p][0].responses[1].value);
        pollDivText = document.createTextNode(pollNames[p] + " " + huffData[p].end_date);
        resultDiv.appendChild(resultDivText);
        pollDiv.appendChild(pollDivText);
    }
}


function Model(array, lowColor, highColor) {
    this.lowColor = lowColor;
    this.highColor = highColor;
    this.maxRatio = array[0];
    this.minRatio = this.maxRatio;
    this.ratios = [];
    for(var i = 0; i < array.length; i++) {
        var r = array[i];                           
        this.maxRatio = Math.max(this.maxRatio, r);  // update maxRatio
        this.minRatio = Math.min(this.minRatio, r);  // update minRatio
        this.ratios.push(r);                         // append to ratio list
    }
    
    this.colors = [];
    for(var i = 0; i < array.length; i++) {
        this.colors.push(this.calculateColor(i));   // for each ratio, calculate gradient color
    }
}

// converts this.ratios[index] to be a value between 0-1
Model.prototype.normalize = function(index) {
    return (this.ratios[index]-this.minRatio)/(this.maxRatio-this.minRatio);
}

// calculate gradient color for a given index
Model.prototype.calculateColor = function(index) {
    var norm = this.normalize(index);                // want high ratios to be gray, low ratios to be blue
    var resultColor = [0,0,0];
    for(var i = 0; i < this.lowColor.length; i++) {
        // interpolate between gray and blue
        resultColor[i] = Math.round( (this.highColor[i]-this.lowColor[i])*norm + this.lowColor[i] );
    }
    return this.colorToRGBString(resultColor);
}

Model.prototype.colorToRGBString = function(resultColor) {
    return "rgb("+resultColor.join(",")+")";
}

Model.prototype.gradientString = function() {
    return "linear-gradient(0deg,"+this.colorToRGBString(this.lowColor)+
                ","+this.colorToRGBString(this.highColor)+")";
}

// Color the map and blocks based on the model
function drawModel(resp) {
    resp = JSON.parse(resp);
    
    var bernieRatio = [];
    var totalHVotes = 0;
    var totalBVotes = 0;
    var bernieNumber = [];

    for(var i = 0; i < resp.length; i++) {
        var current = resp[i];
        var disTotal = current.hVotes+current.bVotes;
        bernieRatio.push(current.bVotes/disTotal);
        var bernieSlack = Math.round(bernieRatio[i]* 100) ;
	    var hillarySlack = 100 - bernieSlack;
        console.log(bernieRatio);

	    //console.log("District " + (i+1) + " Hillary " + hillarySlack + " Bernie " + bernieSlack);
        totalHVotes += current.hVotes;
        totalBVotes += current.bVotes;
    }

    var districtVotes = [];
    for(var j = 0; j < districts.length; j++)
    {
        districtVotes.push(Math.round(districts[j] * bernieRatio[j]));
    }

    console.log(districtVotes);
    var temp = 0;
    for(var x = 0; x < districts.length; x++)
    {
        temp += districtVotes[x];
    }
    
    console.log(76 + temp);

    // create the color gradient
    var m = new Model(bernieRatio, [255,0,0], [0,0,255]);
        
    var boxList = d3.selectAll(".delegateBox");
    boxList.style("background-color", "red");
    
    var topBars = d3.selectAll(".topbar")
    topBars.style("height", function(d, i){ 
            var numBernieDelegates = Math.round(districts[i]*bernieRatio[i]);
            return numBernieDelegates*5+"px";})
    
    var landTitles = d3.selectAll("path.land title");
    landTitles.text(function(d, i) {return d.id});
    
    var paths = d3.selectAll("path.land");
    paths.style("fill", function(d){return m.colors[d.id-1]});
    
    var stateDelegates = d3.selectAll(".stateBox");


    var percentBernieVotes = totalBVotes/(totalHVotes+totalBVotes);
    var modelVotes = document.getElementById("voteResults");
    var stateVotes = document.getElementById("delegateResults");
    var bernTemp = Math.round(percentBernieVotes*100);
    var hilTemp = 100 - bernTemp;
    var percentHilVotes = 1 - percentBernieVotes;

    total = Math.round(percentBernieVotes*stateWide.length);

    var modelVotesText = document.createTextNode("Hillary: " + hilTemp + " Bernie: " + bernTemp);
    var stateVotesText = document.createTextNode("Hillary: " + Math.round(percentHilVotes * 475) + " Bernie: " + Math.round(percentBernieVotes * 475));
    if(count == 0)
    {
        modelVotes.appendChild(modelVotesText);
        stateVotes.appendChild(stateVotesText);
        count++;
    }

    else
    {
        stateVotes.replaceChild(stateVotesText, stateVotes.childNodes[0]);
        modelVotes.replaceChild(modelVotesText, modelVotes.childNodes[0]);
    }

    stateDelegates.style("background-color", 
        function(d, i){
            if(i<total)
                return"rgb(0,0,255)" ;
            else 
                return "rgb(255,0,0)";})
            
    updateScale(m);
}



