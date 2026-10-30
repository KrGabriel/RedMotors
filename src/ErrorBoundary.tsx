import {Component,ReactNode} from 'react';
export default class ErrorBoundary extends Component<{children:ReactNode},{err:boolean}>{
 state={err:false};static getDerivedStateFromError(){return {err:true};}
 componentDidCatch(e:unknown){console.error(e);}
 render(){return this.state.err?<main style={{textAlign:'center',padding:'20vh 5vw'}}><h2>Algo salió mal</h2><p className="meta">Recargá la página para intentar de nuevo.</p><button className="btn pri" onClick={()=>location.reload()}>Recargar</button></main>:this.props.children;}}
