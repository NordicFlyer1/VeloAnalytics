import React from 'react';

/**
 * Exact Seated Racing Cyclist Vector Graphic
 * Directly traced from user-uploaded seated.png:
 * - Neutral warm-grey bike frame matching user image (#8f9288 / text-app-muted)
 * - Modern aerodynamic road racing cyclist:
 *   - Rider body color (#7aa1a7 in light mode / cyan-teal tone, or adaptive with text-app-text option)
 *   - Supports full light & dark mode visibility
 */
export const SeatedCyclistSvg: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
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

      {/* Racing Saddle (tilted slightly, aero cut) */}
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

    {/* Seated Cyclist Silhouette - Matches user-provided muted teal/slate color (#7aa1a7), 
        enhanced with brightness in dark theme via CSS filter or currentColor highlight */}
    <g className="fill-[#7aa1a7] dark:fill-[#94b7bd] transition-colors duration-200">
      {/* Aero Road Helmet & Head profile */}
      <path d="M 152,32 C 149,30 149,32 149,37 C 149,43 154,45 152,48 C 154,50 160,48 163,47 C 168,46 177,39 179,34 C 180,30 175,29 164,30 C 158,31 155,33 152,32 Z" />
      <path d="M 157,43 C 159,47 163,49 166,48 C 168,45 165,42 161,41 Z" />

      {/* Aerodynamic Seated Torso & Jersey: Flat spine, 40 degree aggressive angle */}
      <path d="M 150,49 C 144,55 124,71 106,78 C 92,83 80,88 80,101 C 80,113 96,121 102,121 C 112,121 130,93 144,73 C 152,61 156,53 150,49 Z" />

      {/* Arms & Hands resting on the hoods */}
      <path d="M 144,59 C 150,71 159,91 169,107 C 172,112 181,118 186,118 C 188,118 188,112 184,109 C 176,103 167,88 159,74 C 153,64 146,55 144,59 Z" />

      {/* Hips seated on saddle & Driving Leg down to pedal spindle */}
      <path d="M 82,101 C 80,111 92,131 102,143 C 107,148 118,165 125,179 C 127,183 135,193 138,197 C 142,201 148,200 148,195 C 147,191 139,179 135,171 C 129,159 119,139 115,131 C 107,117 99,103 90,99 Z" />

      {/* Cycling Shoe locked into pedal */}
      <path d="M 129,193 L 148,195 C 151,196 151,200 146,202 L 127,200 C 123,198 125,194 129,193 Z" />
    </g>
  </svg>
);
