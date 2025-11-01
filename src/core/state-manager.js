import loggingService from '../services/logging-service.js';

export default class StateManager {
  constructor() {
    // Estado de cada usuário: { jid: { state, data } }
    this.userStates = new Map();
  }

  getState(jid) {
    return this.userStates.get(jid) || { state: 'INITIAL', data: {} };
  }

  setState(jid, state, data = {}) {
    const currentState = this.userStates.get(jid) || { state: 'INITIAL', data: {} };
    const oldState = currentState.state;

    this.userStates.set(jid, {
      state: state,
      data: { ...currentState.data, ...data },
    });

    // Log mudança de estado
    if (oldState !== state) {
      loggingService.info('Estado do usuário alterado', {
        jid: jid.split('@')[0],
        oldState,
        newState: state,
      });
    }
  }

  updateData(jid, data) {
    const currentState = this.getState(jid);
    this.setState(jid, currentState.state, { ...currentState.data, ...data });
  }

  clearState(jid) {
    this.userStates.delete(jid);
  }

  resetToMenu(jid) {
    this.setState(jid, 'MAIN_MENU', {});
  }
}
