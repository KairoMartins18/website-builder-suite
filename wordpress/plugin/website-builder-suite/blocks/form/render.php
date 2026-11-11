<?php
/**
 * Renderização do bloco wbs/form.
 *
 * @package WebsiteBuilderSuite
 * @var array $attributes Atributos do bloco.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

echo wbs_render_form( $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escapado em wbs_render_form().
