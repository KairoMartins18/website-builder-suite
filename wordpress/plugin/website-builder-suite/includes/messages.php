<?php
/**
 * Mensagens recebidas pelos formulários (painel do WordPress).
 *
 * @package WebsiteBuilderSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Tipo de conteúdo privado para guardar as mensagens.
 */
function wbs_register_message_type() {
	register_post_type(
		'wbs_message',
		array(
			'labels'          => array(
				'name'          => __( 'Mensagens', 'website-builder-suite' ),
				'singular_name' => __( 'Mensagem', 'website-builder-suite' ),
				'edit_item'     => __( 'Ver mensagem', 'website-builder-suite' ),
				'search_items'  => __( 'Buscar mensagens', 'website-builder-suite' ),
				'not_found'     => __( 'Nenhuma mensagem ainda.', 'website-builder-suite' ),
				'menu_name'     => __( 'Mensagens', 'website-builder-suite' ),
			),
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => true,
			'show_in_rest'    => false,
			'menu_icon'       => 'dashicons-email-alt',
			'menu_position'   => 26,
			'supports'        => array( 'title', 'editor' ),
			'capability_type' => 'post',
			'capabilities'    => array( 'create_posts' => 'do_not_allow' ),
			'map_meta_cap'    => true,
		)
	);
}
add_action( 'init', 'wbs_register_message_type' );

/**
 * Coluna com o início da mensagem na listagem.
 *
 * @param array $columns Colunas.
 * @return array
 */
function wbs_message_columns( $columns ) {
	return array(
		'cb'          => $columns['cb'],
		'title'       => __( 'De', 'website-builder-suite' ),
		'wbs_excerpt' => __( 'Mensagem', 'website-builder-suite' ),
		'date'        => $columns['date'],
	);
}
add_filter( 'manage_wbs_message_posts_columns', 'wbs_message_columns' );

/**
 * Conteúdo da coluna.
 *
 * @param string $column  Coluna.
 * @param int    $post_id Post.
 */
function wbs_message_column_content( $column, $post_id ) {
	if ( 'wbs_excerpt' === $column ) {
		echo esc_html( wp_trim_words( get_post_field( 'post_content', $post_id ), 24, '…' ) );
	}
}
add_action( 'manage_wbs_message_posts_custom_column', 'wbs_message_column_content', 10, 2 );
