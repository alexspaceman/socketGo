'use strict';

/* Controllers */

function AppCtrl($scope, socket) {

  // Socket listeners
  // ================

  socket.on('init', function (data) {
    $scope.name = data.name;
    $scope.users = data.users;
    $scope.playerID = data.playerID;
    $scope.globalVar.currentPlayer = data.currentPlayer;
  });

  socket.on('send:message', function (message) {
    $scope.messages.push(message);
  });

  socket.on('pass', function (data) {
    $scope.globalVar.turnNumber = data.number;
    $scope.globalVar.passCounter = data.counter;
    $scope.globalVar.turnColor = data.color;
    $scope.globalVar.currentPlayer = data.currentPlayer;
  });

  socket.on('play', function (data) {
    $scope.globalVar.turnNumber = data.number;
    $scope.globalVar.turnColor = data.color;
    $scope.goBoard = data.board;
    $scope.globalVar.currentPlayer = data.currentPlayer;
  });

  socket.on('change:name', function (data) {
    changeName(data.oldName, data.newName);
  });

  socket.on('user:join', function (data) {
    $scope.messages.push({
      user: 'chatroom',
      text: 'User ' + data.name + ' has joined.'
    });
    $scope.users.push(data.name);
  });

  // add a message to the conversation when a user disconnects or leaves the room
  socket.on('user:left', function (data) {
    $scope.messages.push({
      user: 'chatroom',
      text: 'User ' + data.name + ' has left.'
    });
    var i, user;
    for (i = 0; i < $scope.users.length; i++) {
      user = $scope.users[i];
      if (user === data.name) {
        $scope.users.splice(i, 1);
        break;
      }
    }
  });

  // Private helpers
  // ===============

  var changeName = function (oldName, newName) {
    // rename user in list of users
    var i;
    for (i = 0; i < $scope.users.length; i++) {
      if ($scope.users[i] === oldName) {
        $scope.users[i] = newName;
      }
    }

    $scope.messages.push({
      user: 'chatroom',
      text: 'User ' + oldName + ' is now known as ' + newName + '.'
    });
  }

  // Methods published to the scope
  // ==============================

  $scope.changeName = function () {
    socket.emit('change:name', {
      name: $scope.newName
    }, function (result) {
      if (!result) {
        alert('There was an error changing your name');
      } else {

        changeName($scope.name, $scope.newName);

        $scope.name = $scope.newName;
        $scope.newName = '';
      }
    });
  };

  $scope.messages = [];

  $scope.sendMessage = function () {
    socket.emit('send:message', {
      message: $scope.message
    });

    // add the message to our model locally
    $scope.messages.push({
      user: $scope.name,
      text: $scope.message
    });

    // clear message box
    $scope.message = '';
  };

//GLOBAL VARIABLES
  $scope.globalVar = {
    boardLength: 13,      //GLOBAL set boardLength
    turnNumber: 1,      //turn counter(used to switch player)
    turnColor: '',
    oppositeTurnColor: 'white',
    colorStatus: '',
    allEmptyFlag: false,
    anyEmptyFlag: false,
    enemySurroundFlag: false,
    tookEnemyFlag: false,
    anyEmptyCounter: 0,
    blackScore: 0,
    whiteScore: 0,
    passCounter: 0,
    piecesTakenThisTurn: 0,
    idsTakenThisTurn: [],
    currentPlayer: 1
  }


  var cellWidth = (100 / $scope.globalVar.boardLength).toString() + '%';
  var cellHeight = ((document.getElementById('board').clientWidth - 100 ) / $scope.globalVar.boardLength).toString() + 'px';
  $scope.cellWidth = {
    'width': cellWidth,
    'height': cellHeight
  }

  var boardHeight = document.getElementById('board').clientWidth.toString() + 'px';
  $scope.boardStyle = {
    'height': boardHeight,
    'max-width': boardHeight
  }

//PASS EVENT
  $scope.pass = function () {
    if (isOdd($scope.playerID) && isOdd($scope.globalVar.currentPlayer) ||
        !isOdd($scope.playerID) && !isOdd($scope.globalVar.currentPlayer) ) {
      $scope.globalVar.turnColor = oppositeTurnColor($scope.globalVar.turnColor);
      $scope.globalVar.turnNumber++;
      $scope.globalVar.passCounter++;
      if($scope.globalVar.passCounter == 2){
      //  alert('BOTH PLAYERS PASS' + '\n' + 'count your territory and add it to your score');
      }
      $scope.globalVar.currentPlayer = $scope.globalVar.currentPlayer == 1 ? 2 : 1;
      socket.emit('pass', {
        turnNumber: $scope.globalVar.turnNumber,
        passCounter: $scope.globalVar.passCounter,
        turnColor: $scope.globalVar.turnColor,
        currentPlayer: $scope.globalVar.currentPlayer
      });
    }
  }

  function isOdd(num) {return num % 2;}

//MOUSE UP EVENT
  $scope.mouseUpFunction = function(cell, row, col){
    if(cell.colorStatus == 'emptySpot') {
      if (isOdd($scope.playerID) && isOdd($scope.globalVar.currentPlayer) ||
          !isOdd($scope.playerID) && !isOdd($scope.globalVar.currentPlayer) ) {
        $scope.globalVar.allEmptyFlag = false;      //reset the allEmptyFlag
        $scope.globalVar.anyEmptyFlag = false;      //reset the anyEmptyFlag
        $scope.globalVar.enemySurroundFlag = false;   //reset the enemySurroundFlag
        $scope.globalVar.tookEnemyFlag = false;     //reset the tookEnemyFlag
        $scope.globalVar.anyEmptyCounter = 0;     //reset the anyEmptyCounter
        $scope.globalVar.piecesTakenThisTurn = 0;   //reset the piecesTakenThisTurn

        if($scope.globalVar.idsTakenThisTurn[0] == cell.idNum){
          alert('illegal move, play again');
          cell.colorStatus = 'emptySpot';
          $scope.globalVar.turnNumber--;
        }else{
          $scope.globalVar.idsTakenThisTurn = [];     //reset the idsTakenThisTurn
          resetCheckedStatus($scope.goBoard);
          resetToTakeStatus($scope.goBoard);

          $scope.globalVar.turnColor = getTurnColor($scope.globalVar.turnNumber, cell, $scope.globalVar.turnColor);
          
          checkNeighbours(cell, row, col, $scope.globalVar.boardLength, $scope.goBoard);

          checkSingleIllegal(cell);
          checkMultipleIllegal(cell);
          illegalRepeatMove(cell);
        }

        $scope.globalVar.turnNumber++;
        $scope.globalVar.passCounter = 0;
        $scope.globalVar.piecesTakenThisTurn = 0;
        $scope.globalVar.currentPlayer = $scope.globalVar.currentPlayer == 1 ? 2 : 1;

        socket.emit('play', {
          turnNumber: $scope.globalVar.turnNumber,
          turnColor: $scope.globalVar.turnColor,
          board: $scope.goBoard,
          currentPlayer: $scope.globalVar.currentPlayer
        });
      }
    }
  }

//CHECK FOR REPEAT MOVES
  function illegalRepeatMove(cell){
    if($scope.globalVar.piecesTakenThisTurn == 1){
      //alert('you cant play on id#' + $scope.globalVar.idsTakenThisTurn[0]);
    }else{
      $scope.globalVar.idsTakenThisTurn = [];
    }
  }

//CHECK anyEmptyCounter TO SEE IF YOU SHOULD TAKE ANY PIECES
  function checkAnyEmptyCounter(anyEmptyCounter, goBoard){
    //alert('anyEmptyCounter = ' + anyEmptyCounter);
    if(anyEmptyCounter == 0){
      //alert('Youve taken some pieces');
      $scope.globalVar.tookEnemyFlag = true;
      for(var i = 0; i < goBoard.length; i++){
        for(var j = 0; j < goBoard[i].length; j++){
          if(goBoard[i][j].toTakeStatus == true){
            goBoard[i][j].toTakeStatus = false;
            if(goBoard[i][j].colorStatus == 'black'){
              $scope.globalVar.whiteScore++;
            }else{
              $scope.globalVar.blackScore++;
            }
            $scope.globalVar.piecesTakenThisTurn++;
            ($scope.globalVar.idsTakenThisTurn).push(goBoard[i][j].idNum);
            goBoard[i][j].colorStatus = 'emptySpot';
          }
        }
      }
    }
    $scope.globalVar.anyEmptyCounter = 0;
  }

//RESET THE checkedStatus BOOLEAN
  function resetCheckedStatus(goBoard){
    for(var i = 0; i < goBoard.length; i++){
      for(var j = 0; j < goBoard[i].length; j++){
        goBoard[i][j].checkedStatus = false;
      }
    }
  }

//RESET THE toTakeStatus BOOLEAN
  function resetToTakeStatus(goBoard){
    for(var i = 0; i < goBoard.length; i++){
      for(var j = 0; j < goBoard[i].length; j++){
        goBoard[i][j].toTakeStatus = false;
      }
    }
  }

//CHECK FRIENDLIES FOR POTENTIAL ILLEGAL MOVE
  function checkIllegalFriendly(cell, boardLength, goBoard){
    resetCheckedStatus($scope.goBoard);
    resetToTakeStatus($scope.goBoard);
    $scope.globalVar.anyEmptyCounter = 0;

    checkEnemies(cell, boardLength, goBoard);

    if($scope.globalVar.anyEmptyCounter == 0){
      alert('illegal move, play again');
      cell.colorStatus = 'emptySpot';
      $scope.globalVar.turnNumber--;
      $scope.globalVar.turnColor = oppositeTurnColor($scope.globalVar.turnColor);
    }

    $scope.globalVar.anyEmptyCounter = 0;
  }

//CHECK ENEMIES  -----  the 'cell' is an object like 'goBoard[row][col]'
  function checkEnemies(cell, boardLength, goBoard){
    //alert('checkEnemies().cell = ' + cell + '\n' +
    //  'checkEnemies().cell.colorStatus = ' + cell.colorStatus + '\n' +
    //  'checkEnemies().cell.checkedStatus = ' + cell.checkedStatus + '\n' +
    //  'checkEnemies().cell.idNum = ' + cell.idNum);
    if(cell.checkedStatus == false){
      cell.checkedStatus = true;

      if(cell.cellRow > 1){
        //alert('checkEnemies checkUp' + '\n' +
        //  cell.cellRow + '-' + cell.cellCol + ' -> ' + (cell.cellRow-1) + '-' + cell.cellCol);
        var focusPiece = goBoard[(cell.cellRow-2)][cell.cellCol-1];
        ifCheckRecursion(focusPiece, cell);
      }
      if(cell.cellCol > 1){
        //alert('checkEnemies checkLeft' + '\n' +
        //  cell.cellRow + '-' + cell.cellCol + ' -> ' + cell.cellRow + '-' + (cell.cellCol-1));
        var focusPiece = goBoard[(cell.cellRow-1)][cell.cellCol-2];
        ifCheckRecursion(focusPiece, cell);
      }
      if(cell.cellCol < boardLength){
        //alert('checkEnemies checkRight' + '\n' +
        //  cell.cellRow + '-' + cell.cellCol + ' -> ' + cell.cellRow + '-' + (cell.cellCol+1));
        var focusPiece = goBoard[(cell.cellRow-1)][cell.cellCol];
        ifCheckRecursion(focusPiece, cell);
      }
      if(cell.cellRow < boardLength){
        //alert('checkEnemies checkDown' + '\n' +
        //  cell.cellRow + '-' + cell.cellCol + ' -> ' + (cell.cellRow+1) + '-' + cell.cellCol);
        var focusPiece = goBoard[(cell.cellRow)][cell.cellCol-1];
        ifCheckRecursion(focusPiece, cell);
      }
    }
  }

//CONTINUE CHECK IF STATEMENTS
  function ifCheckRecursion(focusPiece, cell){
    if(focusPiece.checkedStatus == false){
      if(cell.colorStatus == focusPiece.colorStatus){
        //alert('triggering checkEnemies() for id#' + focusPiece.idNum);
        focusPiece.toTakeStatus = true;
        checkEnemies(focusPiece, $scope.globalVar.boardLength, $scope.goBoard);
      }else if(focusPiece.colorStatus != 'emptySpot' && focusPiece.colorStatus != cell.colorStatus){
        //alert('found opposite here: ' + focusPiece.idNum);
      }else if(focusPiece.colorStatus == 'emptySpot'){
        //alert('found empty.  moving on');
        focusPiece.checkedStatus = true;
        $scope.globalVar.anyEmptyCounter++;
      }else{
        alert('this should never have popped up');
      }
    }else{
      //alert('already checked this piece');
    }
  }

//CHECK NEIGHBOURS
  function checkNeighbours(cell, row, col, boardLength, goBoard){
    var immediateEmptyCount = 0;
    var immediateEnemyCount = 0;
    var immediateFriendlyCount = 0;
    var spotsChecked = 0;

    //alert('looking at'+'\n'+'row: '+(row+1)+'\n'+'col: '+(col+1));

    if(row > 0){            //check up
      var checkUp = goBoard[row-1][col];
      if(checkUp.colorStatus == 'emptySpot'){
        immediateEmptyCount++;
        //alert('checkUp found emptySpot');
      }
      if(checkUp.colorStatus == cell.colorStatus){
        immediateFriendlyCount++;
        //alert('checkUp found friendly');
      }
      if(checkUp.colorStatus == oppositeTurnColor(cell.colorStatus)){
        immediateEnemyCount++;
        //alert('checkUp found enemy');
        checkUp.toTakeStatus = true;
        checkEnemies(checkUp, boardLength, goBoard);
        checkAnyEmptyCounter($scope.globalVar.anyEmptyCounter, $scope.goBoard);
      }
      spotsChecked++;
    }
    resetToTakeStatus($scope.goBoard);
    resetCheckedStatus($scope.goBoard);

    if(col > 0){            //check left
      var checkLeft = goBoard[row][col-1];
      if(checkLeft.colorStatus == 'emptySpot'){
        immediateEmptyCount++;
        //alert('checkLeft found emptySpot');
        checkLeft.checkedStatus = true;
      }
      if(checkLeft.colorStatus == cell.colorStatus){
        immediateFriendlyCount++;
        //alert('checkLeft found friendly');
      }
      if(checkLeft.colorStatus == oppositeTurnColor(cell.colorStatus)){
        immediateEnemyCount++;
        //alert('checkLeft found enemy');
        checkLeft.toTakeStatus = true;
        checkEnemies(checkLeft, boardLength, goBoard);
        checkAnyEmptyCounter($scope.globalVar.anyEmptyCounter, $scope.goBoard);
      }
      spotsChecked++;
    }
    resetToTakeStatus($scope.goBoard);
    resetCheckedStatus($scope.goBoard);

    if(col < boardLength-1){      //check right
      var checkRight = goBoard[row][col+1];
      if(checkRight.colorStatus == 'emptySpot'){
        immediateEmptyCount++;
        //alert('checkRight found emptySpot');
        checkRight.checkedStatus = true;
      }
      if(checkRight.colorStatus == cell.colorStatus){
        immediateFriendlyCount++;
        //alert('checkRight found friendly');
      }
      if(checkRight.colorStatus == oppositeTurnColor(cell.colorStatus)){
        immediateEnemyCount++;
        //alert('checkRight found enemy');
        checkRight.toTakeStatus = true;
        checkEnemies(checkRight, boardLength, goBoard);
        checkAnyEmptyCounter($scope.globalVar.anyEmptyCounter, $scope.goBoard);
      }
      spotsChecked++;
    }
    resetToTakeStatus($scope.goBoard);
    resetCheckedStatus($scope.goBoard);

    if(row < boardLength-1){      //check down
      var checkDown = goBoard[row+1][col];
      if(checkDown.colorStatus == 'emptySpot'){
        immediateEmptyCount++;
        //alert('checkDown found emptySpot');
        checkDown.checkedStatus = true;
      }
      if(checkDown.colorStatus == cell.colorStatus){
        immediateFriendlyCount++;
        //alert('checkDown found friendly');
      }
      if(checkDown.colorStatus == oppositeTurnColor(cell.colorStatus)){
        immediateEnemyCount++;
        //alert('checkDown found enemy');
        checkDown.toTakeStatus = true;
        checkEnemies(checkDown, boardLength, goBoard);
        checkAnyEmptyCounter($scope.globalVar.anyEmptyCounter, $scope.goBoard);
      }
      spotsChecked++;
    }
    resetToTakeStatus($scope.goBoard);
    resetCheckedStatus($scope.goBoard);

    //alert('the spots beside this one are: '+'\n'+
    //  'empty- '+immediateEmptyCount+'\n'+
    //  'friendly- '+immediateFriendlyCount+'\n'+
    //  'enemy- '+immediateEnemyCount);

    if(immediateEnemyCount == spotsChecked){
      $scope.globalVar.enemySurroundFlag = true;
    }
    if(immediateEmptyCount == spotsChecked){
      $scope.globalVar.allEmptyFlag = true;
    }
    if(immediateEmptyCount > 0){
      $scope.globalVar.anyEmptyFlag = true;
    }
    //alert('allEmptyFlag is - ' + $scope.globalVar.allEmptyFlag+'\n'+
    //  'anyEmptyFlag is - ' + $scope.globalVar.anyEmptyFlag+'\n'+
    //  'enemySurroundFlag is - ' + $scope.globalVar.enemySurroundFlag+'\n'+
    //  'tookEnemyFlag is - ' + $scope.globalVar.tookEnemyFlag);
  }

//CHECK FOR ILLEGALS
  function checkSingleIllegal(cell){
    if($scope.globalVar.enemySurroundFlag == true && $scope.globalVar.tookEnemyFlag == false){
      alert('illegal move, play again');
      cell.colorStatus = 'emptySpot';
      $scope.globalVar.turnNumber--;
      $scope.globalVar.turnColor = oppositeTurnColor($scope.globalVar.turnColor);
    }
  }

  function checkMultipleIllegal(cell){
    if($scope.globalVar.anyEmptyFlag == false && $scope.globalVar.tookEnemyFlag == false &&
      $scope.globalVar.enemySurroundFlag == false){
      //alert('potential illegal move' + '\n' + 'check friendlies for empty spaces');
      checkIllegalFriendly(cell, $scope.globalVar.boardLength, $scope.goBoard);
    }
  }

//MAKING THE BOARD
  $scope.goBoard = goBoardSetup($scope.globalVar.boardLength);

  function goBoardSetup(boardLength){
    var boardArray = [];
    var idNum = 1;

    for(var row=1; row < boardLength+1; row++){
      boardArray.push([]);
      for(var col=1; col < boardLength+1; col++){
        boardArray[row-1][col-1] = {
          idNum:idNum,
          cellRow:row,
          cellCol:col,
          colorStatus:'emptySpot',
          boardCornerSide:boardCornerSide(row, col, boardLength),
          mouseOverStatus: '',
          checkedStatus: false,
          toTakeStatus: false
        };
        idNum++;
      }
    }
    return boardArray;
  }

  function boardCornerSide(row, col, boardLength){
    if(row == 1 || row == boardLength || col == 1 || col == boardLength){
      if(row + col == 2 || row + col == boardLength + 1 || row + col == boardLength * 2){
        return 'corner';
      }else{
        return 'side';
      }
    }else{
      return 'normal';
    }
  }

//GET TURN COLOR
  function getTurnColor(turnNumber, cell, turnColor){
    if(turnNumber % 2 == 1){
      cell.colorStatus = 'black';
      turnColor = 'white';
    }else{
      cell.colorStatus = 'white';
      turnColor = 'black';
    }
    return turnColor;
  }

//OPPOSITE TURN COLOR
  function oppositeTurnColor(turnColor){
    if(turnColor == 'black'){
      turnColor = 'white';
      return turnColor;
    }else{
      turnColor = 'black';
      return turnColor;
    }
  }
}