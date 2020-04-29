import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'grey',
    alignItems: 'center',
    height: '100%',
  },
  label: {
    fontSize: 30,
    color: 'white',
  },
  labelContainer: {
    marginBottom: 20,
  },
  windowRtcContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  rtcSmall: {
    width: 200,
    height: 300,
  },
  rtcBig: {
    flex: 1,
    minWidth: 600,
    minHeight: 600,
  },
  fullScreenRtcContainer: {
    flex: 1,
  },
  userMenu: {
    paddingTop: 50,
  },
});
export default styles;
