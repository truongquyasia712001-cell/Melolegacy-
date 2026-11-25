\version "2.24.0"
#(set-global-staff-size 28)

\header {
  title = "MeloLegacy OMR Smoke Test"
  subtitle = "Synthetic piano melody for staff detection"
  tagline = ##f
}

\paper {
  #(set-paper-size "a4")
  top-margin = 12\mm
  bottom-margin = 12\mm
  left-margin = 18\mm
  right-margin = 18\mm
  indent = 0
  ragged-bottom = ##t
}

\score {
  \new Staff \relative c' {
    \clef treble
    \time 4/4
    c4 d e f |
    g2 e |
    \bar "|."
  }
  \layout {
    \context {
      \Staff
      \override StaffSymbol.thickness = #1.5
    }
  }
}
