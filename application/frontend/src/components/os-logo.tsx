import LogoLinuxOrg from '@/assets/osicon/linux.org/logo.svg';

function osIdToSrc(osId: string, online = false) {
  if (osId.indexOf('linux') >= 0)
    //lewing@isc.tamu.edu Larry Ewing and The GIMP, CC0, via Wikimedia Commons
    return online
      ? 'https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg'
      : LogoLinuxOrg;

  // NOTE: This is just a placeholder for OS icons.
  // Icons can be added here easily. Icons are missing in the official version due to
  // possible licensing and copyright issues.

  //Example Code:
  //if (osId.startsWith('http://archlinux.org'))
  //  return online
  //    ? 'https://wiki.archlinux.de/images/Archicon.svg'
  //    : LogoArchlinuxOrg;

  return '/hyparvisor.svg';
}

export function OsLogo(props: {
  osId: string | null | undefined;
  className?: string;
}) {
  return (
    <img
      src={osIdToSrc(props.osId ?? '')}
      alt="Unknown OS"
      className={'object-contain ' + (props.className ?? '')}
    />
  );
}
