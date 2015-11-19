var Section = React.createClass({
  displayName: 'Replicator Status',
  getInitialState(){
    return {status: 'unknown'};
  },
  updateStatus(status){
    this.setState({
      status: status||'unknown'
    });
  },
  componentDidMount(){
    Loader.get('/api/v1/replicator/status', function(err, status){
      socket.on('replicator::status', this.updateStatus);
      if(err){
        return;
      }
      this.updateStatus(status);
    }.bind(this));
  },
  componentWillUnmount(){
    socket.off('replicator::status', this.updateStatus);
  },
  tail(e){
    e.preventDefault();
    Loader.post('/api/v1/replicator/start', function(err, status){
      if(err){
        return;
      }
      this.setState({status});
    }.bind(this));
  },
  render(){
    var status = this.state.status.toUpperCase();
    var className = "btn btn-warning";
    switch(status){
      case('TRANSPORT CLOSE'):
        status = 'DEAD';
        className = "btn btn-danger";
        break;
      case('STOPPED'):
        status = 'OFFLINE';
        className = "btn btn-danger";
        break;
      case('TAILING'):
        status = 'ONLINE';
        className = "btn btn-success";
        break;
    }
    return (
      <div>
        <h2 className="sub-header">Replicator Status</h2>
        <button className={className} onClick={this.tail}>{status}</button>
      </div>
    );
  }
});

Actions.register(Section, {role: 'dashboard-section'});
