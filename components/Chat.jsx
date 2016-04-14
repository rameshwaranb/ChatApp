import React from 'react';
import ReactDOM from 'react-dom';
class Header extends React.Component{
  constructor(props){
    super(props);
  }
  render(){
    return (
      <header className = 'header'>
        {this.props.receiver}
        {
          this.props.isReceiverTyping
          ?
          <span className='is-typing'> is typing...</span>
          :
          null
        }
      </header>
    )
  }
}

class FormComponent extends React.Component{
  constructor(props){
    super(props);
  }
  render(){
    return (
      <form onSubmit={this.props.onSubmit}>
        {
          this.props.inputLabel
          ?
          <label>{this.props.inputLabel}</label>
          :
          null
        }
        <input id={this.props.inputName} type="text" className="text-input form-control" value={this.props.inputValue}
        onChange = {this.props.onChangeInput}
        onFocus = {this.props.onFocus ? this.props.onFocus : null}/>
        <button className={"btn btn-primary " + this.props.btnClass}>{this.props.btnContent}</button>
      </form>
    )
  }
}

class Modal extends React.Component{
  constructor(props){
    super(props);
  }
  render(){
    return (
      <div id="modal" className="modal">
        <div className="modal-dialog">
          <div className="modal-content">
          {
            this.props.isRegistered
            ?
            <FormComponent onSubmit={this.props.chooseReceiver}
            inputLabel = 'Choose receiver'
            inputName = 'receiver'
            inputValue = {this.props.receiver}
            onChangeInput = {this.props.onChangeInput.bind(this.props._self,'receiver')}
            btnClass = 'choose-receiver-btn'
            btnContent = 'Done'
            />
            :
            <FormComponent onSubmit={this.props.register}
            inputLabel = 'Name'
            inputName = 'username'
            inputValue = {this.props.username}
            onChangeInput = {this.props.onChangeInput.bind(this.props._self,'username')}
            btnClass = 'register-btn'
            btnContent = 'Register'
            />
          }
          </div>
        </div>
      </div>
    )
  }
}

class Message extends React.Component{
  constructor(props){
    super(props);
  }
  render(){
    var val = this.props.val;
    return (
      <div className={val.sender == this.props.username ? 'msgs by-me clearfix' : 'msgs'}>
        <span className='text'>
          <span className='text-msg'>{val.message}</span>
          {
            val.isSent
            ?
            <span>
            <img src={val.isRead ? 'images/tick_blue.svg' : 'images/tick_black.svg'} className='msg-sent'/>
            {
              val.isDelivered
              ?
              <img src={val.isRead ? 'images/tick_blue.svg' : 'images/tick_black.svg'} className='msg-delivered'/>
              :
              ''
            }
            </span>
            :
            ''
          }
        </span>
      </div>
    )
  }
}

class MessageList extends React.Component{
  constructor(props){
    super(props);
    this.state = {
      messageList : []
    }
  }
  componentDidMount(){
    this.props.socket.on('chat_message', function(msg){
      var messageList = this.state.messageList;
      messageList.push(msg);
      this.setState({
        messageList : messageList
      });
      //Once the receiver gets the message we declare the message delivered
      //So emitting the receiver Acknowledgement
      this.props.socket.emit('receiver_ack',msg);
    }.bind(this));

    this.props.socket.on('sender_ack', function(msg){
      //Adding isSent flag to the Acknowledged message
      var messageList = this.state.messageList.map(function(val){
        if(msg._id == val._id){
          val.isSent = true
        }
        return val;
      });
      this.setState({
        messageList: messageList
      });
    }.bind(this));

    this.props.socket.on('receiver_ack', function(msg){
      //Adding isDelivered flag to the receiver Acknowledged message
      var messageList = this.state.messageList.map(function(val){
        if(msg._id == val._id){
          val['isDelivered'] = true;
        }
        return val;
      });
      this.setState({
        messageList: messageList
      });
    }.bind(this));

    this.props.socket.on('read_ack', function(msg){
      var messageList = this.state.messageList.map(function(val){
        if(msg.sender === val.sender && val.isDelivered && !val.isRead){
          val['isRead'] = true;
        }
        return val;
      });
      this.setState({
        messageList: messageList
      });
    }.bind(this));
  }

  render(){
    return (
      <div className='message-list'>
        {
          this.state.messageList.map(function(val,i){
            return(
              <Message val={val} username={this.props.username} key={i}/>
            )
          },this)
        }
      </div>
    )
  }
}

class Chat extends React.Component{
  constructor(props){
    super(props);
    this.state = {
      isRegistered: false,
      isReceiverSet: false,
      username: '',
      receiver: '',
      message: '',
      isReceiverTyping: false
    }
    this.lastTypedTimestamp = new Date().getTime();
    this.isTypingCheckInterval = 1000;
    this.socket = io();
  }

  componentDidMount(){
    $('#modal').modal('show');

    this.socket.emit('register', {
        name : this.state.username
    });

    this.socket.on('is_typing', function(msg){
      this.setState({
        isReceiverTyping : msg.isTyping
      })
    }.bind(this));

  }

  register(e){
    this.socket.emit('register', {
        name : this.state.username
    });
    this.setState({
      isRegistered : true
    });
    e.preventDefault();
  }

  chooseReceiver(e){
    this.setState({
      isReceiverSet : true
    });
    $('#modal').modal('hide');
    e.preventDefault();
  }

  onChangeInput(key , event){
    var state = {};
    //Changing the username and receiver input to lowercase to maintain consistency
    state[key] = key === 'username' || key === 'receiver' ? event.target.value.toLowerCase() : event.target.value;
    this.setState(state);
    if(key == 'message'){
      //Check if we emitted isTyping before a second
      //We end up typing 10 letters per second sometimes
      //It would end up emitting everytime. So to avoid that
      //put such condition to check only after a second(or any given interval)
      if(new Date().getTime() - this.lastTypedTimestamp > this.isTypingCheckInterval){
        this.emitIsTyping(true);
        //Check whether the user is still typing
        //after the given interval(say a second)
        setTimeout(function(){
          this.checkIfStillTyping();
        }.bind(this),this.isTypingCheckInterval);
      }
      this.lastTypedTimestamp = new Date().getTime();
    }
  }

  emitIsTyping(bool){
    var isTyping = {
      sender : this.state.username,
      receiver : this.state.receiver,
      isTyping : bool
    };
    this.socket.emit('is_typing', isTyping );
  }

  checkIfStillTyping(){
    if(new Date().getTime() - this.lastTypedTimestamp > this.isTypingCheckInterval){
      this.emitIsTyping(false);
    }
    else{
      //Check whether the user is still typing
      //after the given interval(say a second)
      setTimeout(function(){
        this.checkIfStillTyping();
      }.bind(this),this.isTypingCheckInterval);
    }
  }

  sendMessage(e){
    var message = {
        _id : this.state.username + '_t' + (new Date()).getTime(),
        sender : this.state.username,
        receiver : this.state.receiver,
        message : this.state.message
    };
    //Pushing the new message to the array and sending it to the receiver
    var messageList = this.refs.messageList.state.messageList;
    messageList.push(message);
    this.refs.messageList.setState({
      messageList: messageList
    });

    this.socket.emit('chat_message', message);
    this.setState({
      message: ''
    });
    this.emitIsTyping(false);
    e.preventDefault();
  }


  //For now we can just chat with single person
  //So we once the receiver focusses the message box (Like in hangout),
  //we emit that the message has been read.
  onFocus(){
    this.socket.emit('read_ack', {
      sender : this.state.receiver,
      receiver : this.state.username
    });
  }

  render(){
    return(
      <div className='container'>
        {
          this.state.isRegistered
          ?
          <div className='header-username'>
            Username : {this.state.username}
          </div>
          :
          null
        }
        {
          this.state.isReceiverSet
          ?
          <div className='main'>
            <Header isReceiverTyping={this.state.isReceiverTyping} receiver={this.state.receiver}></Header>
            <MessageList username= {this.state.username}
            socket = {this.socket}
            ref = 'messageList'
            />
            <FormComponent onSubmit={this.sendMessage.bind(this)}
            inputName = 'message'
            inputValue = {this.state.message}
            onChangeInput = {this.onChangeInput.bind(this,'message')}
            onFocus={this.onFocus.bind(this)}
            btnClass = ''
            btnContent = 'Send'
            />
          </div>
          :
          <div>
            <Modal isRegistered={this.state.isRegistered}
            chooseReceiver = {this.chooseReceiver.bind(this)}
            register = {this.register.bind(this)}
            username = {this.state.username}
            onChangeInput = {this.onChangeInput}
            _self = {this}
            />
          </div>
        }
      </div>
    );
  }
}

ReactDOM.render(<Chat />, document.getElementById('reactRoot'));
