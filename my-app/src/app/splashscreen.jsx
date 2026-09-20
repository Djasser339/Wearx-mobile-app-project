import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

const WORD = 'WEARX';
const TAGLINE = 'STYLE THAT FITS YOU.';
const NEXT_ROUTE = '/(tabs)/explore';

export default function SplashScreen() {
  const { height } = useWindowDimensions();

  // One driver per animated piece, created once.
  const tileScale = useRef(new Animated.Value(0.6)).current;
  const tileOpacity = useRef(new Animated.Value(0)).current;
  const tileLift = useRef(new Animated.Value(24)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;
  const sweepX = useRef(new Animated.Value(-1)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const letters = useMemo(
    () => WORD.split('').map(() => new Animated.Value(0)),
    []
  );

  useEffect(() => {
    const letterStagger = Animated.stagger(
      70,
      letters.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    );

    const sequence = Animated.sequence([
      // 1. the tile rises and settles
      Animated.parallel([
        Animated.timing(tileOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tileLift, {
          toValue: 0,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(tileScale, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),
      // 2. the monogram fades in, then a light sweep crosses it
      Animated.parallel([
        Animated.timing(markOpacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sweepX, {
          toValue: 1,
          duration: 900,
          delay: 120,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // 3. the wordmark builds letter by letter
      letterStagger,
      // 4. the tagline settles in last
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(450),
      // 5. hand over to the app
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 380,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    sequence.start(({ finished }) => {
      if (finished) router.replace(NEXT_ROUTE);
    });

    return () => sequence.stop();
  }, []);

  const sweepTranslate = sweepX.interpolate({
    inputRange: [-1, 1],
    outputRange: [-110, 110],
  });

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      <StatusBar style="dark" />

      <View style={[styles.center, { paddingBottom: height * 0.12 }]}>
        <Animated.View
          style={[
            styles.tile,
            {
              opacity: tileOpacity,
              transform: [{ translateY: tileLift }, { scale: tileScale }],
            },
          ]}
        >
          <Animated.Text style={[styles.mark, { opacity: markOpacity }]}>
            WX
          </Animated.Text>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.sweep,
              { transform: [{ translateX: sweepTranslate }, { rotate: '18deg' }] },
            ]}
          />
        </Animated.View>

        <View style={styles.word}>
          {WORD.split('').map((char, i) => (
            <Animated.Text
              key={`${char}-${i}`}
              style={[
                styles.letter,
                {
                  opacity: letters[i],
                  transform: [
                    {
                      translateY: letters[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {char}
            </Animated.Text>
          ))}
        </View>
      </View>

      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        {TAGLINE}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#0F1115',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0F1115',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  mark: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
  },
  sweep: {
    position: 'absolute',
    top: -40,
    width: 26,
    height: 180,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  word: {
    flexDirection: 'row',
    marginTop: 26,
  },
  letter: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F1115',
    letterSpacing: 6,
  },
  tagline: {
    position: 'absolute',
    bottom: 64,
    fontSize: 11,
    letterSpacing: 2.4,
    color: '#7D8796',
    fontWeight: '500',
  },
});