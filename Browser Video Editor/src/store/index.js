import { configureStore } from '@reduxjs/toolkit'
import timelineReducer from './timelineSlice'

export const store = configureStore({
  reducer: {
    timeline: timelineReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
})

export default store
