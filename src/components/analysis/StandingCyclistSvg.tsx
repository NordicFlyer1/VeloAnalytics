import React from 'react';

/**
 * Exact Standing Racing Cyclist Vector Graphic
 * Directly traced from user-uploaded standing.png:
 * - Neutral warm-grey bike frame matching user image (#8f9288 / text-app-muted)
 * - Modern aerodynamic road racing cyclist:
 *   - Rider body color (#7aa1a7 in light mode / cyan-teal tone, or adaptive with text-app-text option)
 *   - Supports full light & dark mode visibility
 */
export const StandingCyclistSvg: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 260 225"
    className={className}
    fill="none"
  >
    {/* Road Bike - Aero frame, deep wheels, drop bars in authentic warm grey #8f9288 */}
    <g fill="#8f9288" stroke="#8f9288" strokeLinecap="round" strokeLinejoin="round">
      {/* Rear Wheel (solid aero rim) */}
      <circle cx="68" cy="172" r="34" strokeWidth="8" fill="none" />
      <circle cx="68" cy="172" r="4" fill="#8f9288" stroke="none" />

      {/* Front Wheel (solid aero rim) */}
      <circle cx="192" cy="172" r="34" strokeWidth="8" fill="none" />
      <circle cx="192" cy="172" r="4" fill="#8f9288" stroke="none" />

      {/* Rear Triangle: Chainstay & Seatstay */}
      <line x1="68" y1="172" x2="124" y2="172" strokeWidth="7" />
      <line x1="68" y1="172" x2="98" y2="132" strokeWidth="6" />

      {/* Aero Seat Tube & Post */}
      <line x1="124" y1="172" x2="98" y2="132" strokeWidth="8.5" />
      <line x1="98" y1="132" x2="93" y2="114" strokeWidth="8" />

      {/* Racing Saddle (Empty - rider is standing out of the saddle) */}
      <path d="M 76,112 C 84,108 108,109 116,114 C 106,116 88,116 76,112 Z" fill="#8f9288" stroke="none" />

      {/* Down Tube */}
      <line x1="124" y1="172" x2="164" y2="122" strokeWidth="9.5" />

      {/* Top Tube */}
      <line x1="98" y1="132" x2="164" y2="124" strokeWidth="6.5" />

      {/* Head Tube & Carbon Fork */}
      <line x1="164" y1="122" x2="192" y2="172" strokeWidth="8" />

      {/* Stem & Compact Drop Handlebars with brake hoods */}
      <path
        d="M 164,122 L 172,112 L 186,112 C 194,112 196,121 190,128 C 187,132 178,131 176,126"
        strokeWidth="6"
        fill="none"
      />
      {/* Brake lever protrusion */}
      <line x1="188" y1="112" x2="194" y2="124" strokeWidth="3" />

      {/* Bottom Bracket & Crank Arm */}
      <circle cx="124" cy="172" r="11" fill="#8f9288" stroke="none" />
      <line x1="124" y1="172" x2="136" y2="192" strokeWidth="7" />
      <line x1="130" y1="192" x2="148" y2="192" strokeWidth="8" strokeLinecap="round" />
    </g>

    {/* Standing Cyclist Silhouette - Matches user-provided muted teal/slate color (#7aa1a7),
        enhanced with brightness in dark theme via CSS filter or currentColor highlight */}
    <g className="fill-[#7aa1a7] dark:fill-[#94b7bd] transition-colors duration-200">
      {/* Aero Road Helmet & Head profile (Shifted higher and forward over stem) */}
      <path d="M 166,21 C 163,19 163,21 163,26 C 163,32 168,34 166,37 C 168,39 174,37 177,36 C 182,35 191,28 193,23 C 194,19 189,18 178,19 C 172,20 169,22 166,21 Z" />
      <path d="M 171,32 C 173,36 177,38 180,37 C 182,34 179,31 175,30 Z" />

      {/* Standing Torso & Cycling Jersey: Lifted off saddle, driving forward and down */}
      <path d="M 164,38 C 158,44 137,63 121,73 C 112,80 106,88 108,101 C 110,113 124,119 131,117 C 139,115 151,94 162,76 C 168,64 170,47 164,38 Z" />

      {/* Arms & Hands gripping brake hoods while standing */}
      <path d="M 158,48 C 165,63 171,84 178,100 C 180,106 189,112 193,112 C 195,112 195,106 191,103 C 184,97 178,81 171,67 C 165,54 161,46 158,48 Z" />

      {/* Standing Hips, Thigh & Driving Leg driving straight down through spindle */}
      <path d="M 110,101 C 110,109 119,126 125,140 C 129,148 136,169 138,181 C 139,185 145,195 147,199 C 151,203 156,202 156,197 C 155,193 149,181 147,173 C 142,161 136,140 131,130 C 127,118 122,105 116,101 Z" />

      {/* Cycling Shoe standing directly on pedal */}
      <path d="M 134,195 L 153,197 C 155,198 155,202 150,204 L 132,202 C 128,200 130,196 134,195 Z" />
    </g>
  </svg>
);
