import style from './ConfirmModal.module.css';

interface ConfirmModalProps {
    message: string;
    onConfirm: () =>void;
    onCancel:() =>void;
}
function ConfirmModal({message, onConfirm, onCancel}: ConfirmModalProps) {
    return (
      <div className={style.dim} onClick={onCancel}>
        <div className={style.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <p>{message}</p>
          <div className={style.buttons}>
            <button onClick={onConfirm}>확인</button>
            <button onClick={onCancel}>취소</button>
          </div>
        </div>
      </div>
    )
  }
  export default ConfirmModal;