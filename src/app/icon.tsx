import { ImageResponse } from 'next/og';

// Image generation metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#06080F',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Rounded square border with bottom-left gap */}
          <path
            d="M 25 120 V 45 A 20 20 0 0 1 45 25 H 155 A 20 20 0 0 1 175 45 V 155 A 20 20 0 0 1 155 175 H 80"
            stroke="#5EEAD4"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Stylized P inside */}
          <path
            d="M 75 60 H 120 A 25 25 0 0 1 145 85 A 25 25 0 0 1 120 110 H 75"
            stroke="#5EEAD4"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 75 60 V 140"
            stroke="#5EEAD4"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* Three ascending diagonal arrows */}
          <path
            d="M 35 165 L 115 85"
            stroke="#5EEAD4"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 95 85 H 115 V 105"
            stroke="#5EEAD4"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M 20 180 L 90 110"
            stroke="#5EEAD4"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 70 110 H 90 V 130"
            stroke="#5EEAD4"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M 5 195 L 65 135"
            stroke="#5EEAD4"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 45 135 H 65 V 155"
            stroke="#5EEAD4"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
