export default {
  namespace: 'app',

  state: {
    viewLoaded: false,
  },

  effects: {
    *afterViewCreated(action, { put }) {
      yield put({ type: 'updateViewLoaded', payload: true });
    },
  },

  reducers: {
    updateViewLoaded(state, action) {
      return { ...state, viewLoaded: action.payload };
    },
    updateLoading(state, action) {
      return { ...state, loading: action.payload };
    },
  },
};
