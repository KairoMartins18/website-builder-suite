<?php
/**
 * Formulário de contato: renderização e envio.
 *
 * @package WebsiteBuilderSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Gera o HTML do formulário a partir dos atributos do bloco.
 *
 * @param array $attributes Atributos do bloco wbs/form.
 * @return string
 */
function wbs_render_form( $attributes ) {
	$form_id = sanitize_key( isset( $attributes['formId'] ) ? $attributes['formId'] : '' );
	$fields  = isset( $attributes['fields'] ) && is_array( $attributes['fields'] ) ? array_slice( $attributes['fields'], 0, 30 ) : array();
	if ( ! $form_id || ! $fields ) {
		return '';
	}

	// Guarda destinatário e rótulos no servidor (nunca no HTML público).
	$config = array(
		'email'  => isset( $attributes['email'] ) ? sanitize_email( $attributes['email'] ) : '',
		'labels' => array_map(
			function ( $f ) {
				return sanitize_text_field( isset( $f['label'] ) ? $f['label'] : '' );
			},
			$fields
		),
	);
	$forms = get_option( 'wbs_forms', array() );
	if ( ! isset( $forms[ $form_id ] ) || $forms[ $form_id ] !== $config ) {
		$forms[ $form_id ] = $config;
		update_option( 'wbs_forms', $forms, false );
	}

	$status  = isset( $_GET['wbs_form'], $_GET['wbs_id'] ) && sanitize_key( wp_unslash( $_GET['wbs_id'] ) ) === $form_id ? sanitize_key( wp_unslash( $_GET['wbs_form'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$classes = 'wb-form' . ( ! empty( $attributes['className'] ) ? ' ' . $attributes['className'] : '' );
	$button  = ! empty( $attributes['buttonColor'] ) ? $attributes['buttonColor'] : 'var(--wb-primary)';
	if ( 0 === strpos( $button, 'theme:' ) ) {
		$button = 'var(--wb-' . sanitize_key( substr( $button, 6 ) ) . ')';
	}

	ob_start();
	?>
	<form id="wbs-form-<?php echo esc_attr( $form_id ); ?>" class="<?php echo esc_attr( $classes ); ?>" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<?php if ( 'sent' === $status ) : ?>
			<p class="wb-form-status wb-form-ok" role="status"><?php esc_html_e( 'Mensagem enviada! Obrigado pelo contato.', 'website-builder-suite' ); ?></p>
		<?php elseif ( 'error' === $status ) : ?>
			<p class="wb-form-status wb-form-error" role="alert"><?php esc_html_e( 'Não foi possível enviar. Tente novamente.', 'website-builder-suite' ); ?></p>
		<?php endif; ?>
		<input type="hidden" name="action" value="wbs_form" />
		<input type="hidden" name="_wbs_form" value="<?php echo esc_attr( $form_id ); ?>" />
		<?php wp_nonce_field( 'wbs_form', '_wbs_nonce' ); ?>
		<div class="wb-hp" aria-hidden="true"><label>Website <input type="text" name="wbs_hp" tabindex="-1" autocomplete="off" /></label></div>
		<?php
		foreach ( $fields as $i => $field ) :
			$type     = isset( $field['type'] ) ? $field['type'] : 'text';
			$label    = isset( $field['label'] ) ? $field['label'] : '';
			$required = ! empty( $field['required'] );
			$input_id = 'wbs-' . $form_id . '-' . $i;
			?>
			<label for="<?php echo esc_attr( $input_id ); ?>"<?php echo 'textarea' === $type ? ' class="wb-grow"' : ''; ?>>
				<?php echo esc_html( $label . ( $required ? ' *' : '' ) ); ?>
				<?php if ( 'textarea' === $type ) : ?>
					<textarea id="<?php echo esc_attr( $input_id ); ?>" name="wbs_fields[<?php echo (int) $i; ?>]"<?php echo $required ? ' required aria-required="true"' : ''; ?>></textarea>
				<?php else : ?>
					<input id="<?php echo esc_attr( $input_id ); ?>" type="<?php echo esc_attr( in_array( $type, array( 'text', 'email', 'tel', 'number', 'date' ), true ) ? $type : 'text' ); ?>" name="wbs_fields[<?php echo (int) $i; ?>]"<?php echo $required ? ' required aria-required="true"' : ''; ?><?php echo 'email' === $type ? ' autocomplete="email"' : ( 'tel' === $type ? ' autocomplete="tel"' : '' ); ?> />
				<?php endif; ?>
			</label>
		<?php endforeach; ?>
		<button type="submit" style="background:<?php echo esc_attr( $button ); ?>"><?php echo esc_html( ! empty( $attributes['submitLabel'] ) ? $attributes['submitLabel'] : __( 'Enviar', 'website-builder-suite' ) ); ?></button>
	</form>
	<?php
	return ob_get_clean();
}

/**
 * Recebe o envio: valida, guarda a mensagem e envia por e-mail.
 */
function wbs_handle_form() {
	// wp_get_referer() lê o campo _wp_http_referer gerado por wp_nonce_field().
	$redirect = wp_validate_redirect( (string) wp_get_referer(), home_url( '/' ) );
	$form_id  = isset( $_POST['_wbs_form'] ) ? sanitize_key( wp_unslash( $_POST['_wbs_form'] ) ) : '';
	$back     = function ( $status ) use ( $redirect, $form_id ) {
		wp_safe_redirect( add_query_arg( array( 'wbs_form' => $status, 'wbs_id' => $form_id ), remove_query_arg( array( 'wbs_form', 'wbs_id' ), $redirect ) ) . '#wbs-form-' . $form_id );
		exit;
	};

	if ( ! isset( $_POST['_wbs_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_wbs_nonce'] ) ), 'wbs_form' ) ) {
		$back( 'error' );
	}
	// Campo-armadilha preenchido = robô. Fingimos sucesso.
	if ( ! empty( $_POST['wbs_hp'] ) ) {
		$back( 'sent' );
	}

	$forms  = get_option( 'wbs_forms', array() );
	$config = isset( $forms[ $form_id ] ) ? $forms[ $form_id ] : null;
	if ( ! $config ) {
		$back( 'error' );
	}

	$raw    = isset( $_POST['wbs_fields'] ) && is_array( $_POST['wbs_fields'] ) ? wp_unslash( $_POST['wbs_fields'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
	$lines  = array();
	$values = array();
	$reply  = '';
	foreach ( $config['labels'] as $i => $label ) {
		$value = isset( $raw[ $i ] ) ? sanitize_textarea_field( substr( (string) $raw[ $i ], 0, 5000 ) ) : '';
		$values[ $label ] = $value;
		$lines[]          = $label . ': ' . $value;
		if ( ! $reply && is_email( $value ) ) {
			$reply = $value;
		}
	}

	$first = reset( $values );
	wp_insert_post(
		array(
			'post_type'    => 'wbs_message',
			'post_status'  => 'private',
			'post_title'   => $first ? wp_trim_words( $first, 8, '…' ) : __( 'Mensagem', 'website-builder-suite' ),
			'post_content' => implode( "\n", $lines ),
			'meta_input'   => array(
				'_wbs_form' => $form_id,
				'_wbs_page' => esc_url_raw( $redirect ),
			),
		)
	);

	$to      = ! empty( $config['email'] ) && is_email( $config['email'] ) ? $config['email'] : get_option( 'admin_email' );
	$subject = sprintf( /* translators: %s: nome do site */ __( '[%s] Nova mensagem pelo site', 'website-builder-suite' ), wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) );
	$headers = $reply ? array( 'Reply-To: ' . $reply ) : array();
	wp_mail( $to, $subject, implode( "\n", $lines ) . "\n\n" . $redirect, $headers );

	$back( 'sent' );
}
add_action( 'admin_post_wbs_form', 'wbs_handle_form' );
add_action( 'admin_post_nopriv_wbs_form', 'wbs_handle_form' );
