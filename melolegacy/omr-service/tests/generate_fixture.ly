\version "2.24.0"
\header {
  title = "MeloLegacy OMR Smoke Test"
  subtitle = "Four-note synthetic piano melody"
  tagline = ##f
}
\paper {
  #(set-paper-size "a4")
  indent = 0
}
\score {
  \new Staff \relative c' {
    \clef treble
    \time 4/4
    e4 f g a
    \bar "|."
  }
  \layout { }
}
