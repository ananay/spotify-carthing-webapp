import styles from './Promo.module.scss';
import Type from 'component/CarthingUIComponents/Type/Type';
import { Button, ButtonType } from 'component/CarthingUIComponents';
import phoneCallImage from './images/phone-call.png';
import otherMediaImage from './images/other-media.png';
import { Promo as PromoType } from 'component/Promo/PromoController';
import { useStore } from 'context/store';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

type PromoContent = {
  title: string;
  text: string;
  buttonText: string;
  image: string;
  optionText?: string;
};

const PROMOS: Record<PromoType, PromoContent> = {
  other_media: {
    title: 'Not just Spotify',
    text: 'You can use Car Thing to control playback for other media services too.',
    buttonText: 'Got it',
    image: otherMediaImage,
  },
  phone_calls: {
    title: 'Phone Calls',
    buttonText: 'Got it',
    image: phoneCallImage,
    text: 'Your phone calls will appear on the Car Thing screen. Learn more or turn off this feature in Settings.',
    optionText: 'Settings',
  },
};

export type Props = {
  promo: PromoType;
  onClickButton: () => void;
  onClickOption: () => void;
};
export const Promo = ({ promo, onClickButton, onClickOption }: Props) => {
  const content = PROMOS[promo];
  return (
    <div className={styles.promo}>
      <div className={styles.textAndConfirm}>
        <Type name="brioBold" className={styles.text}>
          {content.title}
        </Type>
        <Type name="celloBook" className={styles.subText}>
          {content.text}
        </Type>
        <Button
          type={ButtonType.BUTTON_PRIMARY}
          onClick={onClickButton}
          className={styles.confirmButton}
          highlightOnDialPress={false}
        >
          {content.buttonText}
        </Button>
      </div>
      <div className={styles.imageAndOption}>
        <img className={styles.image} alt="" src={content.image} />
        {content.optionText && (
          <div className={styles.optionButtonWrapper}>
            <Button type={ButtonType.BUTTON_PRIMARY} onClick={onClickOption}>
              {content.optionText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const PromoWrapper = () => {
  const promoController = useStore().promoController;
  const promo = promoController.nextPromoToShow;

  useEffect(() => {
    promoController.handlePromoShowing();

    return () => promoController.handlePromoDisappearing();
  });

  // to keep the component rendered while transitioning out. nextPromoToShow will become undefined immediately.
  const [promoCache] = useState<PromoType>(promo!);

  return (
    <Promo
      promo={promoCache}
      onClickButton={() =>
        promoController.handlePromoConfirmationSelected(promoCache)
      }
      onClickOption={() =>
        promoController.handlePromoOptionSelected(promoCache)
      }
    />
  );
};

export default observer(PromoWrapper);
