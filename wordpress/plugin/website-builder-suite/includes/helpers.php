<?php
/**
 * Funções auxiliares.
 *
 * @package WebsiteBuilderSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Endereço de uma página pelo slug (funciona com ou sem links permanentes).
 *
 * @param string $slug Slug da página ('' = página inicial).
 * @return string
 */
function wbs_page_url( $slug ) {
	if ( '' === $slug ) {
		return home_url( '/' );
	}
	$page = get_page_by_path( $slug );
	return $page ? get_permalink( $page ) : home_url( '/' . $slug . '/' );
}

/**
 * Troca os marcadores gerados pelo app ({{wbs:theme}}, {{wbs-page:slug}}) por URLs reais.
 *
 * @param string $html Conteúdo com marcadores.
 * @return string
 */
function wbs_resolve_tokens( $html ) {
	$html = str_replace( '{{wbs:theme}}', esc_url( get_stylesheet_directory_uri() ), $html );
	return preg_replace_callback(
		'/\{\{wbs-page:([a-z0-9\-]*)\}\}/',
		function ( $m ) {
			return esc_url( wbs_page_url( $m[1] ) );
		},
		$html
	);
}
