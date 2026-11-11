<?php
/**
 * Renderização do bloco wbs/free-section.
 *
 * @package WebsiteBuilderSuite
 * @var array $attributes Atributos do bloco.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$wbs_css  = isset( $attributes['css'] ) ? wp_strip_all_tags( $attributes['css'] ) : '';
$wbs_html = isset( $attributes['html'] ) ? $attributes['html'] : '';

// O HTML vem dos arquivos do tema gerado (confiáveis) ou de quem tem a permissão "unfiltered_html";
// para os demais usuários o WordPress já filtra (kses) os atributos de blocos ao salvar.
echo '<style>' . $wbs_css . '</style>' . wbs_resolve_tokens( $wbs_html ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
